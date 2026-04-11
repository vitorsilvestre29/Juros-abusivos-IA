"""
Integração com a API do Banco Central do Brasil (SGS).
Busca taxas médias de mercado por modalidade de crédito.
Cache em arquivo JSON com validade de 12 horas.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import json
import os

import httpx

CACHE_HOURS = 12
CACHE_FILE = Path(os.getenv("BCB_CACHE_FILE", "/tmp/bcb_rates_cache.json"))

# Taxas de fallback (% ao mês) usadas quando a API do BCB estiver indisponível.
# Valores baseados nas médias históricas do BCB (2024-2025).
DEFAULT_MONTHLY_RATES: dict[str, float] = {
    "consignado_inss":      1.80,
    "consignado_clt":       2.50,
    "credito_pessoal":      6.20,
    "credito_habitacional": 0.75,
    "cdc_veiculo":          1.90,
    "cartao_credito":      15.00,
    "outros":               4.50,
}

# Limites de abusividade por modalidade (% ao mês)
# Baseado em: taxa > 2x a média de mercado = abusivo (REsp 1.061.530/RS, Súmula 566 STJ)
ABUSIVITY_THRESHOLD: dict[str, float] = {
    "consignado_inss":      2.08,
    "consignado_clt":       4.50,
    "credito_pessoal":      7.00,
    "credito_habitacional": 2.00,
    "cdc_veiculo":          3.50,
    "cartao_credito":      20.00,
    "outros":               7.00,
}

# Séries SGS do Banco Central — configuráveis via variáveis de ambiente na Railway
BCB_SERIES: dict[str, str | None] = {
    "consignado_inss":      os.getenv("BCB_SGS_SERIES_CONSIGNADO_INSS",  "25466"),
    "consignado_clt":       os.getenv("BCB_SGS_SERIES_CONSIGNADO_CLT",   "25475"),
    "credito_pessoal":      os.getenv("BCB_SGS_SERIES_CREDITO_PESSOAL",  "20714"),
    "credito_habitacional": os.getenv("BCB_SGS_SERIES_HABITACIONAL",     "433"),
    "cdc_veiculo":          os.getenv("BCB_SGS_SERIES_VEICULO",          "25480"),
    "cartao_credito":       os.getenv("BCB_SGS_SERIES_CARTAO",           "20739"),
    "outros":               None,
}


def _annual_from_monthly(monthly_pct: float) -> float:
    r = monthly_pct / 100.0
    return round(((1 + r) ** 12 - 1) * 100.0, 2)


def _load_cache() -> dict[str, Any]:
    if not CACHE_FILE.exists():
        return {}
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(data: dict[str, Any]) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def _cache_valid(entry: dict[str, Any]) -> bool:
    ts = entry.get("updated_at")
    if not ts:
        return False
    try:
        updated = datetime.fromisoformat(ts)
        return datetime.now(timezone.utc) - updated <= timedelta(hours=CACHE_HOURS)
    except Exception:
        return False


async def _fetch_sgs(series_id: str) -> float | None:
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{series_id}"
        f"/dados/ultimos/1?formato=json"
    )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            return None
        raw = str(data[0].get("valor", "")).replace(".", "").replace(",", ".")
        return float(raw) if raw else None


async def get_bcb_rate(loan_type: str) -> dict[str, Any]:
    """
    Retorna a taxa média de referência do BCB para o tipo de empréstimo.
    Estratégia: cache (12h) → API SGS → fallback interno.
    """
    normalized = loan_type.strip().lower()
    if normalized not in DEFAULT_MONTHLY_RATES:
        normalized = "credito_pessoal"

    cache = _load_cache()
    if _cache_valid(cache.get(normalized, {})):
        return cache[normalized]

    series_id = BCB_SERIES.get(normalized)
    monthly_rate: float | None = None
    source = "fallback"

    if series_id:
        try:
            monthly_rate = await _fetch_sgs(series_id)
            if monthly_rate is not None:
                source = f"BCB/SGS:{series_id}"
        except Exception:
            monthly_rate = None

    if monthly_rate is None:
        monthly_rate = DEFAULT_MONTHLY_RATES[normalized]

    entry: dict[str, Any] = {
        "loan_type": normalized,
        "monthly_rate_pct": round(float(monthly_rate), 4),
        "annual_rate_pct": _annual_from_monthly(float(monthly_rate)),
        "abusivity_threshold_pct": ABUSIVITY_THRESHOLD.get(normalized, 7.0),
        "source": source,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "cache_hours": CACHE_HOURS,
    }

    cache[normalized] = entry
    _save_cache(cache)
    return entry


# ── Selic e dados extras ──────────────────────────────────────────────────────

# SGS series para Selic e CDI
SGS_SELIC_ANNUAL  = "432"   # Selic acumulada no ano (% a.a.)
SGS_SELIC_MONTHLY = "4390"  # Selic acumulada no mes (% a.m.)
SGS_CDI_MONTHLY   = "4391"  # CDI acumulado no mes (% a.m.)
SGS_CONS_INSS_CAP = "25466" # Taxa media consignado INSS (% a.m.) - serve como referencia de teto

# Teto atual do consignado INSS conforme portaria vigente (% a.m.)
# Atualizado periodicamente - usar SGS_CONS_INSS_CAP como verificacao
CONSIGNADO_INSS_CAP_DEFAULT = 1.80


async def get_selic_rate() -> dict:
    """Retorna a taxa Selic mensal e anual atuais do BCB."""
    cache = _load_cache()
    key = "__selic__"
    if _cache_valid(cache.get(key, {})):
        return cache[key]

    monthly = None
    annual = None
    source = "fallback"

    try:
        monthly = await _fetch_sgs(SGS_SELIC_MONTHLY)
        annual  = await _fetch_sgs(SGS_SELIC_ANNUAL)
        if monthly is not None:
            source = "BCB/SGS:4390"
    except Exception:
        pass

    if monthly is None:
        monthly = 0.90   # fallback: ~10.8% a.a.
        annual  = 10.50

    entry = {
        "selic_monthly_pct": round(float(monthly), 4),
        "selic_annual_pct": round(float(annual), 4) if annual else _annual_from_monthly(float(monthly)),
        "source": source,
        "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    cache[key] = entry
    _save_cache(cache)
    return entry


async def get_consignado_inss_cap() -> dict:
    """Retorna o teto de juros para credito consignado INSS."""
    cache = _load_cache()
    key = "__inss_cap__"
    if _cache_valid(cache.get(key, {})):
        return cache[key]

    rate = None
    source = "fallback"
    try:
        rate = await _fetch_sgs(SGS_CONS_INSS_CAP)
        if rate is not None:
            source = "BCB/SGS:25466"
    except Exception:
        pass

    if rate is None:
        rate = CONSIGNADO_INSS_CAP_DEFAULT

    entry = {
        "cap_monthly_pct": round(float(rate), 4),
        "cap_annual_pct": _annual_from_monthly(float(rate)),
        "source": source,
        "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "note": "Taxa media BCB para consignado INSS - referencia para verificacao de abusividade",
    }
    cache[key] = entry
    _save_cache(cache)
    return entry


async def get_enriched_bcb_context(loan_type: str) -> dict:
    """
    Retorna contexto BCB enriquecido para uso no prompt da IA.
    Inclui: taxa media do tipo, Selic, teto consignado (se aplicavel).
    """
    import asyncio
    tasks = [
        get_bcb_rate(loan_type),
        get_selic_rate(),
    ]
    if loan_type in ("consignado", "consignado_inss", "consignado_clt"):
        tasks.append(get_consignado_inss_cap())
    else:
        tasks.append(__import__("asyncio").sleep(0))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    bcb_data  = results[0] if not isinstance(results[0], Exception) else {}
    selic_data = results[1] if not isinstance(results[1], Exception) else {}
    inss_cap  = results[2] if (len(results) > 2 and not isinstance(results[2], Exception)) else None

    return {
        "loan_rate": bcb_data,
        "selic": selic_data,
        "inss_cap": inss_cap,
    }


def format_bcb_context_for_prompt(ctx: dict) -> str:
    """Formata contexto BCB para inclusao no prompt da IA."""
    loan = ctx.get("loan_rate", {})
    selic = ctx.get("selic", {})
    inss = ctx.get("inss_cap")

    lines = ["=== DADOS BCB (BANCO CENTRAL DO BRASIL) - ATUALIZADOS EM TEMPO REAL ===\n"]

    if loan:
        lines.append(f"Taxa media BCB para '{loan.get('loan_type', '')}': {loan.get('monthly_rate_pct', '?')}% a.m. ({loan.get('annual_rate_pct', '?')}% a.a.)")
        lines.append(f"Limiar de abusividade (2x a media): {round(loan.get('monthly_rate_pct', 0) * 2, 2)}% a.m.")
        lines.append(f"Fonte: {loan.get('source', 'BCB/SGS')}")
        lines.append("")

    if selic:
        lines.append(f"Taxa Selic atual: {selic.get('selic_monthly_pct', '?')}% a.m. / {selic.get('selic_annual_pct', '?')}% a.a.")
        lines.append("")

    if inss:
        lines.append(f"Teto consignado INSS (media BCB): {inss.get('cap_monthly_pct', '?')}% a.m.")
        lines.append(f"Obs: {inss.get('note', '')}")
        lines.append("")

    lines.append("CRITERIO DE ABUSIVIDADE (STJ - REsp 1.061.530/RS): taxa que supera significativamente a media BCB, especialmente acima do dobro, pode ser revista judicialmente.")

    return "\n".join(lines)
