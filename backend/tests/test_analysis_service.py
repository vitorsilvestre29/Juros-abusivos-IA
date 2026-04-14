import sys
import types
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import analysis_service
import database
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from models import Analysis, AnalysisStatus, Contract, User


class FakeMessagesAPI:
    def __init__(self, responses):
        self._responses = list(responses)

    async def create(self, **kwargs):
        if not self._responses:
            raise AssertionError("No fake responses left for anthropic client")
        response = self._responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class FakeAsyncAnthropic:
    responses = []

    def __init__(self, api_key=None):
        self.messages = FakeMessagesAPI(type(self).responses)


def make_tool_response(tool_name: str, tool_input: dict, input_tokens: int = 100, output_tokens: int = 200):
    block = SimpleNamespace(type="tool_use", name=tool_name, input=tool_input)
    usage = SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)
    return SimpleNamespace(content=[block], usage=usage)


class AnalysisServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_loads_ai_json_recovers_from_trailing_comma(self):
        raw = """
        {
          "tipo_contrato": "cdc_veiculo",
          "banco_credor": "Banco Teste",
          "valor_contratado": 25000,
          "taxa_mensal_contratada": 3.1,
          "taxa_anual_contratada": 44.0,
          "taxa_referencia_bcb": 2.0,
          "prazo_meses": 48,
          "irregularidades": [],
          "resumo_tecnico": "Resumo minimo suficiente para passar.",
          "recomendacao": "Recomendacao minima suficiente.",
        }
        """
        data = analysis_service._loads_ai_json(raw)
        self.assertEqual(data["banco_credor"], "Banco Teste")

    def test_finalize_ai_result_text_fields_expands_short_content(self):
        ai_result = {
            "tipo_contrato": "cdc_veiculo",
            "banco_credor": "Banco Teste",
            "valor_contratado": 25000.0,
            "taxa_mensal_contratada": 3.1,
            "taxa_anual_contratada": 44.0,
            "taxa_referencia_bcb": 2.0,
            "prazo_meses": 48,
            "irregularidades": [
                {
                    "tipo": "Taxa acima da media",
                    "descricao": "A taxa mensal contratada supera a referencia do BCB.",
                    "gravidade": "alta",
                    "valor_estimado": 3200.0,
                }
            ],
            "resumo_tecnico": "Curto",
            "recomendacao": "",
        }
        finalized = analysis_service._finalize_ai_result_text_fields(ai_result, 2.0)
        analysis_service._validate_ai_result_strict(finalized, 2.0)
        self.assertGreaterEqual(len(finalized["resumo_tecnico"]), 40)
        self.assertGreaterEqual(len(finalized["recomendacao"]), 20)

    async def test_analyze_contract_succeeds_with_short_summary_via_local_enrichment(self):
        fake_module = types.SimpleNamespace(AsyncAnthropic=FakeAsyncAnthropic)
        FakeAsyncAnthropic.responses = [
            make_tool_response(
                "submit_analysis",
                {
                    "tipo_contrato": "cdc_veiculo",
                    "banco_credor": "Banco Teste",
                    "valor_contratado": 25000.0,
                    "taxa_mensal_contratada": 3.1,
                    "taxa_anual_contratada": 44.0,
                    "taxa_referencia_bcb": 2.0,
                    "prazo_meses": 48,
                    "irregularidades": [
                        {
                            "tipo": "Taxa acima da media",
                            "descricao": "A taxa mensal contratada supera a referencia do BCB.",
                            "gravidade": "alta",
                            "valor_estimado": 3200.0,
                        }
                    ],
                    "resumo_tecnico": "Curto",
                    "recomendacao": "",
                },
            ),
        ]

        with patch.dict(sys.modules, {"anthropic": fake_module}):
            result, usage, model_name = await analysis_service.analyze_contract(
                contract_text="Contrato de financiamento de veiculo com taxa acima da media.",
                loan_type="cdc_veiculo",
                reference_rate=2.0,
            )

        self.assertEqual(model_name, analysis_service._analysis_model_candidates()[0])
        self.assertGreaterEqual(len(result["resumo_tecnico"]), 40)
        self.assertGreaterEqual(len(result["recomendacao"]), 20)
        self.assertGreater(usage["input_tokens"], 0)

    async def test_analyze_contract_succeeds_without_irregularities_using_local_text_completion(self):
        fake_module = types.SimpleNamespace(AsyncAnthropic=FakeAsyncAnthropic)
        FakeAsyncAnthropic.responses = [
            make_tool_response(
                "submit_analysis",
                {
                    "tipo_contrato": "cdc_veiculo",
                    "banco_credor": "Banco Teste",
                    "valor_contratado": 18000.0,
                    "taxa_mensal_contratada": 1.8,
                    "taxa_anual_contratada": 23.8,
                    "taxa_referencia_bcb": 2.0,
                    "prazo_meses": 36,
                    "irregularidades": [],
                    "resumo_tecnico": "Ok",
                    "recomendacao": "",
                },
            ),
        ]

        with patch.dict(sys.modules, {"anthropic": fake_module}):
            result, usage, _model_name = await analysis_service.analyze_contract(
                contract_text="Contrato de financiamento de veiculo sem indicios fortes de abuso.",
                loan_type="cdc_veiculo",
                reference_rate=2.0,
            )

        self.assertEqual(result["irregularidades"], [])
        self.assertIn("nao encontrou irregularidades", result["resumo_tecnico"].lower())
        self.assertGreaterEqual(len(result["recomendacao"]), 20)
        self.assertGreater(usage["output_tokens"], 0)

    async def test_run_full_analysis_in_mock_mode_bypasses_live_bcb_and_completes(self):
        tmp_dir = BACKEND_DIR / "tests" / ".tmp"
        tmp_dir.mkdir(parents=True, exist_ok=True)
        db_path = tmp_dir / "analysis_test.sqlite3"
        if db_path.exists():
            db_path.unlink()

        engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
        session_factory = async_sessionmaker(engine, expire_on_commit=False)

        try:
            async with engine.begin() as conn:
                await conn.run_sync(database.Base.metadata.create_all)

            async with session_factory() as db:
                user = User(name="Teste", email="teste@example.com", hashed_password="x")
                db.add(user)
                await db.flush()

                contract = Contract(
                    user_id=user.id,
                    filename="contrato.pdf",
                    file_type="pdf",
                    file_data=b"%PDF-mock",
                    loan_type="cdc_veiculo",
                )
                db.add(contract)
                await db.flush()

                analysis = Analysis(
                    contract_id=contract.id,
                    user_id=user.id,
                    status=AnalysisStatus.PENDING,
                )
                db.add(analysis)
                await db.commit()

                analysis_id = analysis.id
                contract_id = contract.id

            async def _should_not_call(*_args, **_kwargs):
                raise AssertionError("Live API should not be called in MOCK_MODE")

            with (
                patch.object(analysis_service, "MOCK_MODE", True),
                patch.object(analysis_service, "extract_text_from_pdf", return_value="Contrato de CDC veiculo com taxa acima da media."),
                patch.object(analysis_service, "get_enriched_bcb_context", side_effect=_should_not_call),
                patch.object(analysis_service, "get_stj_context", side_effect=_should_not_call),
                patch.object(database, "AsyncSessionLocal", session_factory),
            ):
                await analysis_service.run_full_analysis(
                    contract_id=contract_id,
                    analysis_id=analysis_id,
                    file_bytes=b"%PDF-mock",
                    file_type="pdf",
                    loan_type="cdc_veiculo",
                    user_email="teste@example.com",
                )

            async with session_factory() as db:
                result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
                saved = result.scalar_one()
                self.assertEqual(saved.status, AnalysisStatus.COMPLETED)
                self.assertIsNotNone(saved.ai_result_json)
                self.assertGreater(saved.bcb_rate_pct, 0)
                self.assertGreaterEqual(saved.irregularities_count, 1)
        finally:
            await engine.dispose()
            if db_path.exists():
                db_path.unlink()


if __name__ == "__main__":
    unittest.main()
