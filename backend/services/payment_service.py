"""
Integração com Mercado Pago para pagamento via PIX.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

MOCK_QR_CODE = "00020126580014br.gov.bcb.pix0136fakepix-uuid-1234-5678-abcd-ef0102030405204000053039865802BR5913Juros Abusivos6008Sao Paulo62070503***6304FAKE"
MOCK_QR_BASE64 = ""  # sem imagem em mock


def _safe_payer_email(user_email: str) -> str:
    email = (user_email or "").strip()
    if "@" in email and "." in email.split("@")[-1] and not email.endswith("@guest.local"):
        return email
    fallback = os.getenv("MERCADOPAGO_PAYER_EMAIL", "").strip()
    if "@" in fallback and "." in fallback.split("@")[-1]:
        return fallback
    return "pagamentos@laudojuros.com.br"


def _naive_utc(dt_value: datetime | None) -> datetime | None:
    if dt_value is None:
        return None
    if dt_value.tzinfo is None:
        return dt_value
    return dt_value.astimezone(timezone.utc).replace(tzinfo=None)


async def create_pix_payment(
    amount: float,
    user_email: str,
    user_name: str,
    description: str,
    analysis_id: int,
    mock: bool = False,
) -> dict[str, Any]:
    """
    Cria um pagamento PIX no Mercado Pago.
    Retorna: payment_id, qr_code, qr_code_base64, ticket_url, expires_at.
    """
    if mock:
        expires = datetime.now(timezone.utc) + timedelta(minutes=30)
        return {
            "payment_id": f"mock_{analysis_id}",
            "qr_code": MOCK_QR_CODE,
            "qr_code_base64": MOCK_QR_BASE64,
            "ticket_url": None,
            "expires_at": _naive_utc(expires),
            "status": "pending",
        }

    access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
    if not access_token:
        raise ValueError("MERCADOPAGO_ACCESS_TOKEN não configurado")

    payload = {
        "transaction_amount": round(float(amount), 2),
        "description": description[:255],
        "payment_method_id": "pix",
        "payer": {
            "email": _safe_payer_email(user_email),
            "first_name": user_name.split()[0] if user_name else "Cliente",
        },
        "external_reference": str(analysis_id),
        "date_of_expiration": (
            datetime.now(timezone.utc) + timedelta(minutes=30)
        ).strftime("%Y-%m-%dT%H:%M:%S.000-03:00"),
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Idempotency-Key": f"analysis-{analysis_id}-{int(datetime.now().timestamp())}",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.mercadopago.com/v1/payments",
            json=payload,
            headers=headers,
        )
        if resp.status_code >= 400:
            raise RuntimeError(
                f"MercadoPago error {resp.status_code}: {resp.text[:500]}"
            )
        data = resp.json()

    txn = data.get("point_of_interaction", {}).get("transaction_data", {})
    expires_str = data.get("date_of_expiration")
    expires_at: datetime | None = None
    if expires_str:
        try:
            expires_at = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
        except Exception:
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

    return {
        "payment_id": str(data.get("id", "")),
        "qr_code": txn.get("qr_code", ""),
        "qr_code_base64": txn.get("qr_code_base64", ""),
        "ticket_url": txn.get("ticket_url", None),
        "expires_at": _naive_utc(expires_at),
        "status": data.get("status", "pending"),
    }


async def get_payment_status_mp(mp_payment_id: str, mock: bool = False) -> str:
    """
    Consulta o status de um pagamento no Mercado Pago.
    Retorna: "approved", "pending", "rejected", etc.
    """
    if mock:
        return "approved"

    access_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
    if not access_token:
        return "unknown"

    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.mercadopago.com/v1/payments/{mp_payment_id}",
            headers=headers,
        )
        if resp.status_code != 200:
            return "unknown"
        data = resp.json()

    return data.get("status", "unknown")
