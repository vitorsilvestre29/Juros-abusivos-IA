import sys
import unittest
from pathlib import Path
from types import SimpleNamespace


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import AnalysisStatus
from routers.contracts import get_analysis_status


class _FakeExecuteResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class _FakeSession:
    def __init__(self, contract):
        self.contract = contract

    async def execute(self, _query):
        return _FakeExecuteResult(self.contract)


class ContractsRouterTests(unittest.IsolatedAsyncioTestCase):
    async def test_status_marks_contract_type_mismatch_as_non_retryable(self):
        contract = SimpleNamespace(
            id=7,
            user_id=1,
            loan_type="consignado_inss",
            filename="contrato.pdf",
            created_at=SimpleNamespace(isoformat=lambda: "2026-04-15T10:00:00"),
            analysis=SimpleNamespace(
                id=9,
                status=AnalysisStatus.FAILED,
                error_message=(
                    "O tipo de contrato selecionado nao confere com o documento enviado. "
                    "Voce marcou 'Consignado INSS', mas o contrato indica 'Consignado CLT (desconto em folha)'."
                ),
                payment=None,
            ),
        )

        payload = await get_analysis_status(
            contract_id=7,
            db=_FakeSession(contract),
            current_user=SimpleNamespace(id=1),
        )

        self.assertEqual(payload["error_code"], "contract_type_mismatch")
        self.assertFalse(payload["retryable"])


if __name__ == "__main__":
    unittest.main()
