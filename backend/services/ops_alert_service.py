from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx

_last_sent_at: dict[str, datetime] = {}


def _cooldown_seconds() -> int:
    try:
        return int(os.getenv("ALERT_COOLDOWN_SECONDS", "300"))
    except Exception:
        return 300


def _can_send(event_key: str) -> bool:
    cooldown = _cooldown_seconds()
    now = datetime.now(timezone.utc)
    prev = _last_sent_at.get(event_key)
    if prev is None:
        _last_sent_at[event_key] = now
        return True
    elapsed = (now - prev).total_seconds()
    if elapsed >= cooldown:
        _last_sent_at[event_key] = now
        return True
    return False


async def send_ops_alert(event: str, message: str, metadata: dict[str, Any] | None = None) -> None:
    """
    Envia alerta operacional para webhook configurado.
    Variaveis:
      - ALERT_WEBHOOK_URL: endpoint para alertas (Slack/Discord/Make/etc)
      - ALERT_COOLDOWN_SECONDS: evita spam por evento (default 300)
    """
    if not _can_send(event):
        return

    webhook_url = os.getenv("ALERT_WEBHOOK_URL", "").strip()
    payload = {
        "event": event,
        "message": message,
        "metadata": metadata or {},
        "sent_at_utc": datetime.now(timezone.utc).isoformat(),
        "service": "juridico-ai-backend",
    }

    print(f"[ops-alert] {event}: {message} | metadata={metadata or {}}")

    if not webhook_url:
        return

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(webhook_url, json=payload)
    except Exception as e:
        print(f"[ops-alert] webhook_error: {e}")

