import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import AnalysisStatus, PaymentStatus
from routers.reports import get_full_report_json


class _FakeExecuteResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeSession:
    def __init__(self, analysis):
        self.analysis = analysis

    async def execute(self, _query):
        return _FakeExecuteResult(self.analysis)


class ReportsRouterTests(unittest.IsolatedAsyncioTestCase):
    async def test_full_report_returns_json_even_if_status_failed_when_payload_exists(self):
        analysis = SimpleNamespace(
            id=99,
            user_id=1,
            status=AnalysisStatus.FAILED,
            error_message="Falha secundaria",
            ai_result_json='{"tipo_contrato":"cdc_veiculo","resumo_tecnico":"ok","recomendacao":"ok"}',
            bcb_rate_pct=3.2,
            impact_brl=1200.0,
            irregularities_count=2,
            completed_at=None,
            report_generated_at=None,
            payment=SimpleNamespace(status=PaymentStatus.PAID),
            contract=SimpleNamespace(loan_type="cdc_veiculo"),
        )

        payload = await get_full_report_json(
            analysis_id=99,
            db=_FakeSession(analysis),
            current_user=SimpleNamespace(id=1),
        )

        self.assertEqual(payload["analysis_id"], 99)
        self.assertEqual(payload["tipo_contrato"], "cdc_veiculo")

    async def test_full_report_still_raises_422_when_failed_and_payload_missing(self):
        analysis = SimpleNamespace(
            id=100,
            user_id=1,
            status=AnalysisStatus.FAILED,
            error_message="Falha real",
            ai_result_json=None,
            bcb_rate_pct=0.0,
            impact_brl=0.0,
            irregularities_count=0,
            completed_at=None,
            report_generated_at=None,
            payment=SimpleNamespace(status=PaymentStatus.PAID),
            contract=SimpleNamespace(loan_type="cdc_veiculo"),
        )

        with self.assertRaises(HTTPException) as ctx:
            await get_full_report_json(
                analysis_id=100,
                db=_FakeSession(analysis),
                current_user=SimpleNamespace(id=1),
            )

        self.assertEqual(ctx.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
