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


if __name__ == "__main__":
    unittest.main()
