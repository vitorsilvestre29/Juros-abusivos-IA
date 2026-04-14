import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.report_service import _report_view


class ReportServiceTests(unittest.TestCase):
    def test_report_view_maps_current_ai_schema(self):
        ai_result = {
            "tipo_contrato": "cdc_veiculo",
            "banco_credor": "Banco Exemplo S.A.",
            "valor_contratado": 25000.0,
            "taxa_mensal_contratada": 4.5,
            "taxa_anual_contratada": 68.0,
            "taxa_referencia_bcb": 3.2,
            "prazo_meses": 48,
            "irregularidades": [
                {
                    "tipo": "Taxa acima da media BCB",
                    "descricao": "Taxa mensal de 4,5% supera a media BCB.",
                    "gravidade": "alta",
                    "valor_estimado": 8500.0,
                }
            ],
            "resumo_tecnico": "Contrato apresenta irregularidades tecnicas relevantes.",
            "recomendacao": "Recomenda-se avaliacao juridica especializada.",
        }

        view = _report_view(ai_result)

        self.assertEqual(view["banco"], "Banco Exemplo S.A.")
        self.assertEqual(view["valor_liberado"], "R$ 25.000,00")
        self.assertEqual(view["taxa_mensal"], "4.50% a.m.")
        self.assertEqual(view["taxa_anual"], "68.00% a.a.")
        self.assertEqual(view["numero_parcelas"], "48")
        self.assertEqual(view["resumo"], "Contrato apresenta irregularidades tecnicas relevantes.")
        self.assertEqual(len(view["irregularidades"]), 1)


if __name__ == "__main__":
    unittest.main()
