from __future__ import annotations

import re
from typing import Any


def _parse_brl(value: str | None) -> float | None:
    if not value:
        return None
    text = str(value)
    cleaned = re.sub(r"[^0-9,.-]", "", text)
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_percent(value: str | None) -> float | None:
    if not value:
        return None
    text = str(value)
    cleaned = re.sub(r"[^0-9,.-]", "", text)
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_int(value: str | None) -> int | None:
    if not value:
        return None
    digits = re.sub(r"[^0-9]", "", str(value))
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def _pmt(principal: float, monthly_rate_pct: float, months: int) -> float:
    r = monthly_rate_pct / 100.0
    if r <= 0:
        return principal / max(months, 1)
    return principal * (r * (1 + r) ** months) / (((1 + r) ** months) - 1)


def _sum_irregular_amounts(irregularidades: list[dict[str, Any]] | None) -> float:
    total = 0.0
    if not irregularidades:
        return total
    for irr in irregularidades:
        amount = _parse_brl(irr.get("valor_cobrado"))
        if amount and amount > 0:
            total += amount
    return round(total, 2)


def calculate_financial_impact(analysis: dict[str, Any], reference_monthly_rate_pct: float) -> dict[str, Any]:
    """
    Estima impacto financeiro com base em:
    - valor liberado
    - taxa mensal contratada
    - número de parcelas
    - soma de cobranças destacadas como indevidas
    """
    principal = _parse_brl(analysis.get("valor_emprestimo"))
    contracted_rate = _parse_percent(analysis.get("taxa_mensal"))
    months = _parse_int(analysis.get("numero_parcelas"))
    irregular_sum = _sum_irregular_amounts(analysis.get("irregularidades"))

    if not principal or not contracted_rate or not months or months <= 0:
        return {
            "status": "insufficient_data",
            "methodology": "Impacto requer valor do empréstimo, taxa mensal e número de parcelas.",
            "irregular_charges_sum_brl": irregular_sum,
            "estimated_overcharge_brl": irregular_sum,
        }

    contracted_installment = _pmt(principal, contracted_rate, months)
    reference_installment = _pmt(principal, reference_monthly_rate_pct, months)
    contracted_total = contracted_installment * months
    reference_total = reference_installment * months
    interest_overcharge = max(contracted_total - reference_total, 0.0)
    total_impact = interest_overcharge + irregular_sum

    return {
        "status": "ok",
        "methodology": (
            "Comparação entre sistema Price com taxa contratada e taxa média de referência do mercado, "
            "somada às cobranças identificadas como potencialmente indevidas."
        ),
        "principal_brl": round(principal, 2),
        "months": months,
        "contracted_rate_monthly_pct": round(contracted_rate, 4),
        "reference_rate_monthly_pct": round(reference_monthly_rate_pct, 4),
        "contracted_installment_brl": round(contracted_installment, 2),
        "reference_installment_brl": round(reference_installment, 2),
        "contracted_total_brl": round(contracted_total, 2),
        "reference_total_brl": round(reference_total, 2),
        "interest_overcharge_brl": round(interest_overcharge, 2),
        "irregular_charges_sum_brl": irregular_sum,
        "estimated_overcharge_brl": round(total_impact, 2),
    }
