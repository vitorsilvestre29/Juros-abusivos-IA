import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import bcb_service


class BCBServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_rejects_wrong_series_override_for_consignado_clt(self):
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
            with self.assertRaises(bcb_service.BCBAPIError):
                await bcb_service.get_bcb_rate("consignado_clt", force_refresh=True)

    async def test_accepts_official_series_for_consignado_clt(self):
        fake_result = {
            "serie": "25475",
            "label": "Taxa media BCB - consignado_clt",
            "value": 3.2,
            "reference_date": "01/02/2026",
            "source_url": "mock://bcb",
            "fetched_at": "2026-02-01T00:00:00+00:00",
        }

        with (
            patch.dict(os.environ, {"BCB_SGS_SERIES_CLT": "25475"}, clear=False),
            patch.object(bcb_service, "_load_cache", return_value={}),
            patch.object(bcb_service, "_save_cache", return_value=None),
            patch.object(bcb_service, "_sgs_fetch", return_value=fake_result),
        ):
            result = await bcb_service.get_bcb_rate("consignado_clt", force_refresh=True)

        self.assertEqual(result["bcb_serie"], "25475")
        self.assertEqual(result["loan_type"], "consignado_clt")


if __name__ == "__main__":
    unittest.main()
