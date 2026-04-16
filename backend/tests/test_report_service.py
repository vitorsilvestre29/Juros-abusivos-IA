import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.report_service import _contract_field_rows, _cta_copy, _report_view


class ReportServiceTests(unittest.TestCase):
    def test_contract_field_rows_marks_inferred_values(self):
        view = {
            "banco": "Banco Exemplo",
            "numero_contrato": "123",
            "data_contrato": "22/10/2022 (inferida pelo 1º vencimento em 22/11/2022)",
            "valor_liberado": "R$ 37.500,00",
            "taxa_mensal": "2.97% a.m.",
            "taxa_anual": "42.08% a.a.",
            "cet_mensal": "3,21% a.m.",
            "cet_anual": "46,86% a.a.",
            "numero_parcelas": "48",
            "valor_parcela": "R$ 1.580,19",
            "valor_total_devido": "R$ 75.849,12",
            "cliente_nome": "Edna Lucia Palmeira Atavila",
            "cliente_cpf": "323.900.251-53",
        }

        rows = _contract_field_rows(view, 3.2)

        self.assertIn(["Data do Contrato (estimado)", "22/10/2022 (inferida pelo 1º vencimento em 22/11/2022)"], rows)

    def test_cta_copy_changes_when_no_irregularities(self):
        body, message = _cta_copy(False)

        self.assertIn("não apontou irregularidades relevantes", body)
        self.assertIn("consulta preventiva", message)
        self.assertNotIn("ação revisional", body)

    def test_support_email_is_defaulted(self):
        from services import report_service

        self.assertEqual(report_service.SUPPORT_EMAIL, "vitorcesarsilvestre2017@gmail.com")

    def test_report_view_maps_current_ai_schema(self):
        ai_result = {
            "tipo_contrato": "cdc_veiculo",
            "banco_credor": "Banco Exemplo S.A.",
            "valor_contratado": 25000.0,
            "taxa_mensal_contratada": 4.5,
            "taxa_anual_contratada": 68.0,
            "taxa_referencia_bcb": 3.2,
            "bcb_reference_date": "01/02/2023",
            "bcb_requested_reference_date": "08/02/2023",
            "bcb_serie": "25480",
            "bcb_source_url": "https://api.bcb.gov.br/dados/serie/bcdata.sgs.25480/dados",
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
        self.assertEqual(view["bcb_reference_date"], "01/02/2023")
        self.assertEqual(view["bcb_serie"], "25480")
        self.assertEqual(view["bcb_source_url"], "https://api.bcb.gov.br/dados/serie/bcdata.sgs.25480/dados")
        self.assertEqual(view["numero_parcelas"], "48")
        self.assertEqual(view["resumo"], "Contrato apresenta irregularidades tecnicas relevantes.")
        self.assertEqual(len(view["irregularidades"]), 1)

    def test_contract_field_rows_includes_bcb_traceability(self):
        view = {
            "banco": "Banco Exemplo",
            "numero_contrato": "123",
            "data_contrato": "08/02/2023",
            "valor_liberado": "R$ 10.000,00",
            "taxa_mensal": "4.39% a.m.",
            "taxa_anual": "67.46% a.a.",
            "cet_mensal": "5,14% a.m.",
            "cet_anual": "82,44% a.a.",
            "numero_parcelas": "36",
            "valor_parcela": "R$ 648,91",
            "valor_total_devido": "R$ 23.360,76",
            "cliente_nome": "—",
            "cliente_cpf": "—",
            "bcb_reference_date": "01/02/2023",
            "bcb_requested_reference_date": "08/02/2023",
            "bcb_serie": "25466",
            "bcb_source_url": "https://api.bcb.gov.br/dados/serie/bcdata.sgs.25466/dados",
        }

        rows = _contract_field_rows(view, 2.82)

        self.assertIn(["Série SGS BCB", "25466"], rows)
        self.assertIn(["Fonte BCB", "https://api.bcb.gov.br/dados/serie/bcdata.sgs.25466/dados"], rows)


if __name__ == "__main__":
    unittest.main()
