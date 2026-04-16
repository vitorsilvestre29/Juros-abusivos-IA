import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import bcb_service
from models import LOAN_TYPES


PUBLIC_LOAN_TYPE_SERIES = {
    "consignado_inss": "25468",
    "consignado_clt": "25466",
    "credito_pessoal": "25464",
    "credito_habitacional": "25497",
    "cdc_veiculo": "25480",
    "cartao_credito": "20739",
}


class BCBServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_all_public_loan_types_have_explicit_bcb_series(self):
        self.assertEqual(set(LOAN_TYPES), set(PUBLIC_LOAN_TYPE_SERIES))
        for loan_type, expected_serie in PUBLIC_LOAN_TYPE_SERIES.items():
            self.assertEqual(bcb_service.DEFAULT_SERIES_MAP[loan_type], expected_serie)
            self.assertEqual(bcb_service.STRICT_OFFICIAL_SERIES[loan_type], expected_serie)

    async def test_rejects_wrong_series_override_for_consignado_clt(self):
        fake_result = {
            "serie": "25468",
            "label": "Taxa media BCB - consignado_clt",
            "value": 3.2,
            "reference_date": "01/02/2026",
            "source_url": "mock://bcb",
            "fetched_at": "2026-02-01T00:00:00+00:00",
        }

        with (
            patch.dict(os.environ, {"BCB_SGS_SERIES_CLT": "25468"}, clear=False),
            patch.object(bcb_service, "_load_cache", return_value={}),
            patch.object(bcb_service, "_save_cache", return_value=None),
            patch.object(bcb_service, "_sgs_fetch", return_value=fake_result),
        ):
            with self.assertRaises(bcb_service.BCBAPIError):
                await bcb_service.get_bcb_rate("consignado_clt", force_refresh=True)

    async def test_rejects_wrong_series_override_for_every_public_loan_type(self):
        wrong_env_by_loan_type = {
            "consignado_inss": "BCB_SGS_SERIES_INSS",
            "consignado_clt": "BCB_SGS_SERIES_CLT",
            "credito_pessoal": "BCB_SGS_SERIES_CREDITO_PESSOAL",
            "credito_habitacional": "BCB_SGS_SERIES_HABITACIONAL",
            "cdc_veiculo": "BCB_SGS_SERIES_CDC_VEICULO",
            "cartao_credito": "BCB_SGS_SERIES_CARTAO",
        }

        for loan_type, env_key in wrong_env_by_loan_type.items():
            with self.subTest(loan_type=loan_type):
                with (
                    patch.dict(os.environ, {env_key: "99999"}, clear=False),
                    patch.object(bcb_service, "_load_cache", return_value={}),
                    patch.object(bcb_service, "_save_cache", return_value=None),
                ):
                    with self.assertRaises(bcb_service.BCBAPIError):
                        await bcb_service.get_bcb_rate(loan_type, force_refresh=True)

    async def test_accepts_official_series_for_consignado_clt(self):
        fake_result = {
            "serie": "25466",
            "label": "Taxa media BCB - consignado_clt",
            "value": 3.2,
            "reference_date": "01/02/2026",
            "source_url": "mock://bcb",
            "fetched_at": "2026-02-01T00:00:00+00:00",
        }

        with (
            patch.dict(os.environ, {"BCB_SGS_SERIES_CLT": "25466"}, clear=False),
            patch.object(bcb_service, "_load_cache", return_value={}),
            patch.object(bcb_service, "_save_cache", return_value=None),
            patch.object(bcb_service, "_sgs_fetch", return_value=fake_result),
        ):
            result = await bcb_service.get_bcb_rate("consignado_clt", force_refresh=True)

        self.assertEqual(result["bcb_serie"], "25466")
        self.assertEqual(result["loan_type"], "consignado_clt")

    async def test_fetches_historical_rate_on_or_before_contract_date(self):
        fake_result = {
            "serie": "25466",
            "label": "Taxa media BCB - consignado_clt em 08/02/2023",
            "value": 2.82,
            "reference_date": "01/02/2023",
            "source_url": "mock://bcb-historico",
            "fetched_at": "2023-02-08T00:00:00+00:00",
        }

        with (
            patch.object(bcb_service, "_load_cache", return_value={}),
            patch.object(bcb_service, "_save_cache", return_value=None),
            patch.object(bcb_service, "_sgs_fetch_on_or_before", return_value=fake_result),
        ):
            result = await bcb_service.get_bcb_rate(
                "consignado_clt",
                force_refresh=True,
                reference_date="08/02/2023",
            )

        self.assertEqual(result["monthly_rate_pct"], 2.82)
        self.assertEqual(result["bcb_reference_date"], "01/02/2023")
        self.assertEqual(result["requested_reference_date"], "08/02/2023")

    async def test_fetches_historical_rate_with_expected_series_for_every_public_loan_type(self):
        async def fake_fetch(serie, label, target_date):
            return {
                "serie": serie,
                "label": label,
                "value": 2.5,
                "reference_date": "01/02/2023",
                "source_url": f"mock://bcb/{serie}",
                "fetched_at": "2023-02-08T00:00:00+00:00",
            }

        with (
            patch.object(bcb_service, "_load_cache", return_value={}),
            patch.object(bcb_service, "_save_cache", return_value=None),
            patch.object(bcb_service, "_sgs_fetch_on_or_before", side_effect=fake_fetch) as fetch_mock,
        ):
            for loan_type, expected_serie in PUBLIC_LOAN_TYPE_SERIES.items():
                with self.subTest(loan_type=loan_type):
                    result = await bcb_service.get_bcb_rate(
                        loan_type,
                        force_refresh=True,
                        reference_date="08/02/2023",
                    )
                    self.assertEqual(result["bcb_serie"], expected_serie)
                    self.assertEqual(result["requested_reference_date"], "08/02/2023")
                    self.assertEqual(result["bcb_reference_date"], "01/02/2023")

        called_series = [call.args[0] for call in fetch_mock.call_args_list]
        self.assertEqual(called_series, list(PUBLIC_LOAN_TYPE_SERIES.values()))


if __name__ == "__main__":
    unittest.main()
