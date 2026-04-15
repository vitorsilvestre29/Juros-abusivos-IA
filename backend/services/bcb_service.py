"""
Servico BCB — busca SEMPRE ao vivo nas APIs publicas do Banco Central do Brasil.
Zero valores hardcoded: se a API estiver indisponivel, levanta excecao explícita.

APIs utilizadas:
  1. BCB/SGS (Sistema Gerenciador de Series Temporais)
     https://api.bcb.gov.br/dados/serie/bcdata.sgs.{SERIE}/dados/ultimos/1?formato=json
  2. BCB/OLINDA (Open Data — backup para taxas de mercado)
     https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/...

Mapeamento de modalidades para series SGS (oficiais, publicados pelo BCB):
  consignado_inss      -> SGS 25466  (Credito pessoal consignado - INSS, % a.m.)
  consignado_clt       -> SGS 25475  (Credito pessoal consignado - privado, % a.m.)
  credito_pessoal      -> SGS 20714  (Credito pessoal nao consignado, % a.m.)
  credito_habitacional -> SGS 25497  (Financiamento habitacional / imobiliario PF, % a.m.)
  cdc_veiculo         -> SGS 25480   (Credito veiculos PF - CDC, % a.m.)
  cartao_credito       -> SGS 20739  (Cartao de credito rotativo total, % a.m.)
  cheque_especial      -> SGS 20668  (Cheque especial - PF, % a.m.)
  capital_giro         -> SGS 20616  (Capital de giro ate 365 dias, % a.m.)
  selic                -> SGS 4390   (Selic acumulada no mes, % a.m.)
  selic_anual          -> SGS 432    (Selic acumulada no ano, % a.a.)
  cdi                  -> SGS 4391   (CDI acumulado no mes, % a.m.)
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

# Cache curto para endpoints auxiliares; no pipeline principal a consulta pode ser forçada ao vivo.
CACHE_HOURS = 1
CACHE_FILE  = Path(os.getenv("BCB_CACHE_FILE", "/tmp/bcb_rates_cache.json"))

SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados/ultimos/1?formato=json"

# Mapeamento oficial modalidade -> serie SGS do BCB
# Fonte: https://www3.bcb.gov.br/sgspub/localizarseries/localizarSeries.do
# Mapeamento verificado no portal: https://dadosabertos.bcb.gov.br/
# Cada serie e a taxa media de mercado (% a.m.) para a modalidade — publicada mensalmente pelo BCB
DEFAULT_SERIES_MAP: dict[str, str] = {
    # Credito consignado - INSS: SGS 25466
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/25466-taxa-media-mensal-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---cre
    "consignado_inss":      "25466",
    "consignado":           "25466",  # alias

    # Credito consignado - privado (CLT/servidores): SGS 25475
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/25475-taxa-media-mensal-de-juros
    "consignado_clt":       "25475",

    # Credito pessoal nao consignado: SGS 20714
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/20714-taxa-media-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---credito-p
    "credito_pessoal":      "20714",

    # Credito habitacional / financiamento imobiliario - PF: SGS 25497
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/25497-taxa-media-mensal-de-juros-das-operacoes-de-credito-com-recursos-direcionados---pessoas-fisic
    "credito_habitacional": "25497",
    "financiamento_imovel": "25497",  # alias legado

    # CDC / Financiamento de veiculo - PF: SGS 25480
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/25480-taxa-media-mensal-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---cre
    "cdc_veiculo":          "25480",
    "financiamento_veiculo":"25480",  # alias legado

    # Cartao de credito rotativo total - PF: SGS 20739
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/20739-taxa-media-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---cartao-de-
    "cartao_credito":       "20739",

    # Cheque especial - PF: SGS 20668
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/20668-taxa-media-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-fisicas---cheque-esp
    "cheque_especial":      "20668",

    # Capital de giro - PJ - prazo superior a 365 dias: SGS 25442
    # Fonte: https://dadosabertos.bcb.gov.br/dataset/25442-taxa-media-mensal-de-juros-das-operacoes-de-credito-com-recursos-livres---pessoas-juridicas--
    "capital_giro":         "25442",

    # Outros (fallback): usa credito pessoal nao consignado como referencia
    "outros":               "20714",
}

# Faixas amplas de sanidade (% a.m.) por modalidade.
# Objetivo: falhar com erro explicito quando uma serie errada for usada.
EXPECTED_MONTHLY_RATE_BOUNDS: dict[str, tuple[float, float]] = {
    "consignado_inss": (0.3, 4.0),
    "consignado": (0.3, 4.0),
    "consignado_clt": (0.5, 8.0),
    "credito_pessoal": (0.5, 20.0),
    "credito_habitacional": (0.1, 5.0),
    "financiamento_imovel": (0.1, 5.0),
    "cdc_veiculo": (0.2, 10.0),
    "financiamento_veiculo": (0.2, 10.0),
    "cartao_credito": (2.0, 30.0),
    "cheque_especial": (1.0, 25.0),
    "capital_giro": (0.2, 15.0),
    "outros": (0.2, 30.0),
}

# Series auxiliares (sempre buscadas)
SERIE_SELIC_MENSAL = "4390"
SERIE_SELIC_ANUAL  = "432"
SERIE_CDI_MENSAL   = "4391"


# ── Cache ─────────────────────────────────────────────────────────────────────

def _load_cache() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _save_cache(data: dict) -> None:
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.write_text(json.dumps(data, ensure_ascii=False, default=str), encoding="utf-8")
    except Exception:
        pass

def _cache_is_fresh(entry: dict) -> bool:
    ts = entry.get("fetched_at")
    if not ts:
        return False
    try:
        from datetime import timedelta
        fetched = datetime.fromisoformat(ts)
        return (datetime.now(timezone.utc) - fetched).total_seconds() < CACHE_HOURS * 3600
    except Exception:
        return False


# ── Fetch SGS ─────────────────────────────────────────────────────────────────

async def _sgs_fetch(serie: str, label: str) -> dict[str, Any]:
    """
    Busca uma serie SGS do BCB.
    Levanta BCBAPIError se indisponivel.
    """
    url = SGS_BASE.format(serie=serie)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise ValueError(f"BCB retornou lista vazia para serie {serie}")
            row = data[-1]  # ultimo registro
            raw_val = str(row.get("valor", "")).strip()
            if "." in raw_val and "," in raw_val:
                normalized_val = raw_val.replace(".", "").replace(",", ".")
            elif "," in raw_val:
                normalized_val = raw_val.replace(",", ".")
            else:
                normalized_val = raw_val
            val = float(normalized_val)
            raw_date = row.get("data", "")
            return {
                "serie": serie,
                "label": label,
                "value": val,
                "reference_date": raw_date,
                "source_url": url,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            }
    except httpx.HTTPError as e:
        raise BCBAPIError(f"BCB/SGS serie {serie} ({label}) indisponivel: {e}") from e
    except Exception as e:
        raise BCBAPIError(f"Erro ao processar serie {serie} ({label}): {e}") from e


class BCBAPIError(RuntimeError):
    """Levantada quando a API do BCB esta indisponivel. Nao use dados estaticos."""
    pass


ENV_SERIES_BY_LOAN_TYPE: dict[str, tuple[str, ...]] = {
    # Consignado CLT
    "consignado_clt": ("BCB_SGS_SERIES_CLT",),
    # Consignado INSS
    "consignado_inss": ("BCB_SGS_SERIES_INSS",),
    "consignado": ("BCB_SGS_SERIES_INSS",),
    # Credito pessoal nao consignado (compat com nome legado)
    "credito_pessoal": ("BCB_SGS_SERIES_CREDITO_PESSOAL", "BCB_SGS_SERIES_BANCARIO_DIRETO"),
    # Habitacional
    "credito_habitacional": ("BCB_SGS_SERIES_HABITACIONAL",),
    # CDC veiculo
    "cdc_veiculo": ("BCB_SGS_SERIES_CDC_VEICULO",),
    "financiamento_veiculo": ("BCB_SGS_SERIES_CDC_VEICULO",),
    # Cartao
    "cartao_credito": ("BCB_SGS_SERIES_CARTAO",),
    # Cheque especial
    "cheque_especial": ("BCB_SGS_SERIES_CHEQUE_ESPECIAL",),
    # Capital de giro
    "capital_giro": ("BCB_SGS_SERIES_CAPITAL_GIRO",),
    # Fallback
    "outros": ("BCB_SGS_SERIES_OUTROS",),
}


STRICT_OFFICIAL_SERIES: dict[str, str] = {
    "consignado_inss": "25466",
    "consignado_clt": "25475",
}


def _resolve_series_for_loan_type_with_source(loan_type: str) -> tuple[str | None, str]:
    normalized = (loan_type or "").strip().lower()

    for env_key in ENV_SERIES_BY_LOAN_TYPE.get(normalized, ()):
        env_val = str(os.getenv(env_key, "")).strip()
        if env_val:
            return env_val, f"env:{env_key}"

    return DEFAULT_SERIES_MAP.get(normalized), "default"


def _resolve_series_for_loan_type(loan_type: str) -> str | None:
    serie, _source = _resolve_series_for_loan_type_with_source(loan_type)
    return serie


def _enforce_strict_official_series(loan_type: str, serie: str, source: str) -> None:
    normalized = (loan_type or "").strip().lower()
    expected = STRICT_OFFICIAL_SERIES.get(normalized)
    if not expected:
        return

    if str(os.getenv("BCB_ALLOW_CUSTOM_SERIES", "false")).strip().lower() == "true":
        return

    if str(serie).strip() != expected:
        raise BCBAPIError(
            "Serie SGS invalida para modalidade critica de consignado. "
            f"loan_type={normalized}, serie_configurada={serie}, serie_oficial={expected}, origem={source}. "
            "Ajuste as variaveis BCB_SGS_SERIES_* ou remova overrides para usar o mapeamento oficial."
        )


def _validate_rate_sanity(loan_type: str, monthly_rate_pct: float, serie: str) -> None:
    bounds = EXPECTED_MONTHLY_RATE_BOUNDS.get((loan_type or "").strip().lower())
    if not bounds:
        return

    min_expected, max_expected = bounds
    value = float(monthly_rate_pct)
    if value < min_expected or value > max_expected:
        raise BCBAPIError(
            "Taxa BCB fora da faixa esperada para a modalidade selecionada. "
            f"loan_type={loan_type}, serie={serie}, taxa={value:.4f}% a.m., "
            f"faixa_esperada=[{min_expected:.2f}, {max_expected:.2f}]% a.m."
        )


# ── Funcoes publicas ──────────────────────────────────────────────────────────

async def get_bcb_rate(loan_type: str, force_refresh: bool = False) -> dict[str, Any]:
    """
    Retorna a taxa media de mercado do BCB para o tipo de emprestimo.
    Se force_refresh=True, ignora cache e consulta a API publica ao vivo.
    Levanta BCBAPIError se a API estiver indisponivel ou se o tipo for invalido.
    """
    normalized = loan_type.strip().lower()
    serie, series_source = _resolve_series_for_loan_type_with_source(normalized)
    if serie is None:
        raise BCBAPIError(
            f"Tipo de contrato invalido para consulta BCB: '{loan_type}'."
        )
    _enforce_strict_official_series(normalized, serie, series_source)

    cache_key = f"rate_{normalized}_{serie}"
    cache = _load_cache()
    if (not force_refresh) and _cache_is_fresh(cache.get(cache_key, {})):
        return cache[cache_key]

    result = await _sgs_fetch(serie, f"Taxa media BCB - {normalized}")
    _validate_rate_sanity(normalized, float(result["value"]), serie)

    monthly = result["value"]
    r = monthly / 100.0
    annual = round(((1 + r) ** 12 - 1) * 100.0, 4)
    abusivity_threshold = round(monthly * 2, 4)  # STJ REsp 1.061.530: acima do dobro = abusivo

    entry: dict[str, Any] = {
        "loan_type": normalized,
        "monthly_rate_pct": round(monthly, 4),
        "annual_rate_pct": annual,
        "abusivity_threshold_monthly_pct": abusivity_threshold,
        "abusivity_threshold_annual_pct": round(((1 + abusivity_threshold/100)**12 - 1)*100, 2),
        "bcb_reference_date": result["reference_date"],
        "bcb_serie": serie,
        "source_url": result["source_url"],
        "fetched_at": result["fetched_at"],
        "cache_hours": CACHE_HOURS,
        "note": "Limiar de abusividade = 2x a media BCB (STJ REsp 1.061.530/RS, Tema Repetitivo)",
    }
    cache[cache_key] = entry
    _save_cache(cache)
    return entry


async def get_selic_rate(force_refresh: bool = False) -> dict[str, Any]:
    """Retorna a taxa Selic atual (mensal e anual) do BCB — sempre ao vivo."""
    cache = _load_cache()
    key = "__selic__"
    if (not force_refresh) and _cache_is_fresh(cache.get(key, {})):
        return cache[key]

    mensal = await _sgs_fetch(SERIE_SELIC_MENSAL, "Selic acumulada no mes")
    anual  = await _sgs_fetch(SERIE_SELIC_ANUAL,  "Selic acumulada no ano")

    entry = {
        "selic_monthly_pct": round(mensal["value"], 4),
        "selic_annual_pct":  round(anual["value"],  4),
        "bcb_reference_date": mensal["reference_date"],
        "source_url_monthly": mensal["source_url"],
        "source_url_annual":  anual["source_url"],
        "fetched_at": mensal["fetched_at"],
    }
    cache[key] = entry
    _save_cache(cache)
    return entry


async def get_cdi_rate(force_refresh: bool = False) -> dict[str, Any]:
    """Retorna a taxa CDI atual do BCB — sempre ao vivo."""
    cache = _load_cache()
    key = "__cdi__"
    if (not force_refresh) and _cache_is_fresh(cache.get(key, {})):
        return cache[key]

    cdi = await _sgs_fetch(SERIE_CDI_MENSAL, "CDI acumulado no mes")
    entry = {
        "cdi_monthly_pct": round(cdi["value"], 4),
        "bcb_reference_date": cdi["reference_date"],
        "source_url": cdi["source_url"],
        "fetched_at": cdi["fetched_at"],
    }
    cache[key] = entry
    _save_cache(cache)
    return entry


async def get_consignado_inss_cap(force_refresh: bool = False) -> dict[str, Any]:
    """
    Retorna a taxa media BCB para consignado INSS (serie 25466).
    Esta e a referencia oficial publicada pelo BCB para a modalidade.
    O teto legal (portaria MPS) e politica governamental e pode divergir.
    """
    return await get_bcb_rate("consignado_inss", force_refresh=force_refresh)


async def get_enriched_bcb_context(loan_type: str, force_refresh: bool = False) -> dict[str, Any]:
    """
    Busca em paralelo: taxa da modalidade + Selic + CDI.
    Retorna contexto completo para o prompt da IA.
    Levanta BCBAPIError se qualquer fetch critico falhar.
    """
    import asyncio

    tasks = [
        get_bcb_rate(loan_type, force_refresh=force_refresh),
        get_selic_rate(force_refresh=force_refresh),
        get_cdi_rate(force_refresh=force_refresh),
    ]

    # Para consignado, busca tambem a serie especifica INSS como referencia adicional
    if loan_type in ("consignado", "consignado_inss"):
        tasks.append(get_consignado_inss_cap(force_refresh=force_refresh))
    else:
        tasks.append(asyncio.sleep(0))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    loan_data  = results[0]
    selic_data = results[1]
    cdi_data   = results[2]
    inss_data  = results[3] if len(results) > 3 else None

    # Taxa da modalidade e critica — se falhar, propaga o erro
    if isinstance(loan_data, Exception):
        raise loan_data

    # Selic/CDI sao importantes mas nao bloqueiam
    if isinstance(selic_data, Exception):
        selic_data = {"error": str(selic_data)}
    if isinstance(cdi_data, Exception):
        cdi_data = {"error": str(cdi_data)}
    if isinstance(inss_data, Exception):
        inss_data = None

    return {
        "loan_rate": loan_data,
        "selic": selic_data,
        "cdi": cdi_data,
        "inss_cap": inss_data if inss_data and not isinstance(inss_data, type(None)) else None,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def format_bcb_context_for_prompt(ctx: dict) -> str:
    """
    Formata o contexto BCB para o prompt da IA.
    Inclui fontes exatas para rastreabilidade.
    """
    loan  = ctx.get("loan_rate", {})
    selic = ctx.get("selic", {})
    cdi   = ctx.get("cdi", {})
    inss  = ctx.get("inss_cap")
    fetched = ctx.get("fetched_at", "")

    lines = [
        "=== TAXAS OFICIAIS BCB — CONSULTADAS AO VIVO ===",
        f"Consulta realizada em: {fetched[:19].replace('T', ' ')} UTC",
        "",
    ]

    if loan and "monthly_rate_pct" in loan:
        lines += [
            f"MODALIDADE ANALISADA: {loan.get('loan_type', '').upper()}",
            f"  Taxa media de mercado (BCB): {loan['monthly_rate_pct']}% a.m. / {loan['annual_rate_pct']}% a.a.",
            f"  Data de referencia BCB: {loan.get('bcb_reference_date', '')}",
            f"  Serie SGS: {loan.get('bcb_serie', '')}",
            f"  Fonte: {loan.get('source_url', '')}",
            f"  Limiar de abusividade (2x a media — STJ REsp 1.061.530/RS): {loan.get('abusivity_threshold_monthly_pct', '')}% a.m.",
            "",
        ]

    if selic and "selic_monthly_pct" in selic:
        lines += [
            f"TAXA SELIC ATUAL: {selic['selic_monthly_pct']}% a.m. / {selic['selic_annual_pct']}% a.a.",
            f"  Data de referencia BCB: {selic.get('bcb_reference_date', '')}",
            f"  Fonte mensal: {selic.get('source_url_monthly', '')}",
            "",
        ]

    if cdi and "cdi_monthly_pct" in cdi:
        lines += [
            f"TAXA CDI ATUAL: {cdi['cdi_monthly_pct']}% a.m.",
            f"  Fonte: {cdi.get('source_url', '')}",
            "",
        ]

    if inss and "monthly_rate_pct" in inss:
        lines += [
            f"TAXA MEDIA BCB - CONSIGNADO INSS: {inss['monthly_rate_pct']}% a.m.",
            f"  Serie SGS 25466 | Data: {inss.get('bcb_reference_date', '')}",
            "",
        ]

    lines += [
        "INSTRUCAO CRITICA: Use EXCLUSIVAMENTE os valores acima para comparar com o contrato.",
        "Nao use nenhum numero que nao esteja neste contexto. Cite a fonte BCB em cada irregularidade.",
    ]

    return "\n".join(lines)
