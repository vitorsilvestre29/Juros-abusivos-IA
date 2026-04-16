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

    def test_normalize_ai_result_preserves_extended_contract_fields(self):
        parsed = {
            "tipo_contrato": "consignado_inss",
            "banco_credor": "Banco Exemplo S.A.",
            "numero_contrato": "ABC123",
            "data_contrato": "10/01/2026",
            "valor_contratado": 37500,
            "taxa_mensal_contratada": 2.97,
            "taxa_anual_contratada": 42.08,
            "cet_mensal": "3,11% a.m.",
            "cet_anual": "44,31% a.a.",
            "taxa_referencia_bcb": 1.45,
            "prazo_meses": 48,
            "valor_parcela": "R$ 1.234,56",
            "valor_total_devido": "R$ 59.258,88",
            "dados_cliente": {"nome": "Maria Silva", "cpf": "000.000.000-00"},
            "irregularidades": [
                {
                    "tipo": "Tarifa abusiva",
                    "descricao": "Tarifa nao prevista.",
                    "gravidade": "media",
                    "valor_estimado": 450.0,
                    "trecho_contrato": "Clausula 5",
                    "fundamento_legal": "Resolucao CMN 4.881/2021",
                    "valor_cobrado": "R$ 450,00",
                }
            ],
            "resumo_tecnico": "Resumo completo o suficiente para passar na validacao.",
            "recomendacao": "Recomendacao objetiva e suficiente.",
        }

        normalized = analysis_service._normalize_ai_result(parsed, "cdc_veiculo", 3.2)

        self.assertEqual(normalized["numero_contrato"], "ABC123")
        self.assertEqual(normalized["data_contrato"], "10/01/2026")
        self.assertEqual(normalized["cet_mensal"], "3,11% a.m.")
        self.assertEqual(normalized["valor_parcela"], "R$ 1.234,56")
        self.assertEqual(normalized["dados_cliente"]["nome"], "Maria Silva")
        self.assertEqual(normalized["irregularidades"][0]["fundamento_legal"], "Resolucao CMN 4.881/2021")
        self.assertEqual(normalized["tipo_contrato"], "cdc_veiculo")
        self.assertEqual(normalized["taxa_referencia_bcb"], 3.2)

    def test_assert_contract_type_consistency_blocks_strong_mismatch(self):
        contract_text = (
            "Emprestimo com desconto em folha de pagamento, holerite e autorizacao do empregador."
        )
        with self.assertRaises(RuntimeError):
            analysis_service._assert_contract_type_consistency("consignado_inss", contract_text)

    def test_assert_contract_type_consistency_blocks_vehicle_vs_housing_mismatch(self):
        contract_text = (
            "Contrato de financiamento imobiliario com alienacao fiduciaria do imovel no SFH."
        )
        with self.assertRaises(RuntimeError):
            analysis_service._assert_contract_type_consistency("cdc_veiculo", contract_text)

    def test_assert_contract_type_consistency_does_not_block_with_ambiguous_text(self):
        contract_text = (
            "Contrato de emprestimo com parcelas fixas e credito liberado em conta corrente."
        )
        analysis_service._assert_contract_type_consistency("credito_pessoal", contract_text)
        analysis_service._assert_contract_type_consistency("consignado_clt", contract_text)

    def test_extract_contract_reference_date_prefers_emissao(self):
        contract_text = (
            "CCB Nº 123 VALOR NOMINAL 1000 EMISSAO 08/02/2023 VENCIMENTO INICIAL 10/04/2023\n"
            "Sao Paulo, 10/02/2023"
        )
        self.assertEqual(
            analysis_service._extract_contract_reference_date(contract_text),
            "08/02/2023",
        )

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

    async def test_run_full_analysis_in_mock_ai_mode_bypasses_live_bcb_and_completes(self):
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
                raise AssertionError("Live API should not be called in MOCK_AI_MODE")

            with (
                patch.object(analysis_service, "_is_mock_ai_mode", return_value=True),
                patch.object(
                    analysis_service,
                    "extract_text_from_pdf",
                    return_value="Contrato de CDC veiculo. Emissao 08/02/2023. Taxa acima da media.",
                ),
                patch.object(analysis_service, "get_enriched_bcb_context", side_effect=_should_not_call),
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
