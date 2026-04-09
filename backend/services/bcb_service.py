from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import json
import os

import httpx


CACHE_HOURS = 12
CACHE_FILE = Path(os.getenv("BCB_CACHE_FILE", "/tmp/bcb_rates_cache.json"))

# Fallback seguro para manter a operação em pé quando a API externa falha.
DEFAULT_MONTHLY_RATES = {
    "clt": 3.5,
    "bancario_direto": 4.5,
    "saude": 4.5,
}


def _series_for_case_type(case_type: str | None) -> str | None:
    normalized = (case_type or "").strip().lower()
    env_map = {
        "clt": os.getenv("BCB_SGS_SERIES_CLT"),
        "bancario_direto": os.getenv("BCB_SGS_SERIES_BANCARIO_DIRETO"),
        "saude": os.getenv("BCB_SGS_SERIES_SAUDE"),
    }
    return env_map.get(normalized)


def _annual_from_monthly(monthly_rate_pct: float) -> float:
    monthly = monthly_rate_pct / 100.0
    annual = (1 + monthly) ** 12 - 1
    return round(annual * 100.0, 2)


def _load_cache() -> dict[str, Any]:
    if not CACHE_FILE.exists():
        return {}
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(payload: dict[str, Any]) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def _cache_is_valid(entry: dict[str, Any]) -> bool:
    ts = entry.get("updated_at")
    if not ts:
        return False
    try:
        updated = datetime.fromisoformat(ts)
        return datetime.now(timezone.utc) - updated <= timedelta(hours=CACHE_HOURS)
    except Exception:
        return False


async def _fetch_sgs_latest_monthly_rate(series_id: str) -> float | None:
    url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}/dados/ultimos/1?formato=json"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        raw = str(data[0].get("valor", "")).replace(".", "").replace(",", ".")
        try:
            return float(raw)
        except ValueError:
            return None


async def get_bcb_reference_rate(case_type: str | None) -> dict[str, Any]:
    """
    Retorna taxa média de referência para o tipo de caso.
    Estratégia:
    1) cache válido (12h)
    2) API SGS (se série estiver configurada em env)
    3) fallback interno
    """
    normalized = (case_type or "").strip().lower() or "bancario_direto"
    if normalized not in DEFAULT_MONTHLY_RATES:
        normalized = "bancario_direto"

    cache = _load_cache()
    cached_entry = cache.get(normalized, {})
    if _cache_is_valid(cached_entry):
        return cached_entry

    series_id = _series_for_case_type(normalized)
    monthly_rate = None
    source = "fallback"

    if series_id:
        try:
            monthly_rate = await _fetch_sgs_latest_monthly_rate(series_id)
            if monthly_rate is not None:
                source = f"BCB/SGS:{series_id}"
        except Exception:
            monthly_rate = None

    if monthly_rate is None:
        monthly_rate = DEFAULT_MONTHLY_RATES[normalized]

    payload = {
        "case_type": normalized,
        "monthly_rate_pct": round(float(monthly_rate), 4),
        "annual_rate_pct": _annual_from_monthly(float(monthly_rate)),
        "source": source,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "cache_hours": CACHE_HOURS,
    }
    cache[normalized] = payload
    _save_cache(cache)
    return payload
