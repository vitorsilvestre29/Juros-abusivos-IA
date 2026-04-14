from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Analysis


def _is_mock_mode() -> bool:
    return os.getenv("MOCK_MODE", "false").lower() == "true"


def _daily_limit() -> int:
    try:
        return int(os.getenv("AI_DAILY_ANALYSIS_LIMIT", "0"))
    except Exception:
        return 0


def _daily_budget_brl() -> float:
    try:
        return float(os.getenv("AI_DAILY_BUDGET_BRL", "0"))
    except Exception:
        return 0.0


def _estimated_cost_per_analysis_brl() -> float:
    try:
        return float(os.getenv("AI_ESTIMATED_COST_PER_ANALYSIS_BRL", "0"))
    except Exception:
        return 0.0


async def get_daily_analysis_usage(db: AsyncSession) -> int:
    now = datetime.utcnow()
    day_start = datetime(now.year, now.month, now.day)
    day_end = day_start + timedelta(days=1)

    try:
        result = await db.execute(
            select(func.count(Analysis.id)).where(
                Analysis.created_at >= day_start,
                Analysis.created_at < day_end,
            )
        )
        return int(result.scalar() or 0)
    except Exception as e:
        print(f"[ai-ops] usage_check_error: {e}")
        return 0


async def check_ai_capacity(db: AsyncSession) -> dict[str, Any]:
    """
    Verifica se ainda ha capacidade diaria para rodar novas analises com IA.
    Regras:
    - Se MOCK_MODE=true, sempre permite.
    - AI_DAILY_ANALYSIS_LIMIT > 0: bloqueia quando atingir o limite.
    - AI_DAILY_BUDGET_BRL > 0 e AI_ESTIMATED_COST_PER_ANALYSIS_BRL > 0:
      bloqueia quando o proximo processamento ultrapassar o budget diario estimado.
    """
    if _is_mock_mode():
        return {
            "allowed": True,
            "reason": None,
            "usage_today": 0,
            "daily_limit": _daily_limit(),
            "daily_budget_brl": _daily_budget_brl(),
            "estimated_cost_per_analysis_brl": _estimated_cost_per_analysis_brl(),
            "estimated_spend_today_brl": 0.0,
        }

    usage_today = await get_daily_analysis_usage(db)
    daily_limit = _daily_limit()
    daily_budget_brl = _daily_budget_brl()
    cost_per_analysis = _estimated_cost_per_analysis_brl()
    estimated_spend_today = round(usage_today * cost_per_analysis, 4)

    if daily_limit > 0 and usage_today >= daily_limit:
        return {
            "allowed": False,
            "reason": "limit_reached",
            "usage_today": usage_today,
            "daily_limit": daily_limit,
            "daily_budget_brl": daily_budget_brl,
            "estimated_cost_per_analysis_brl": cost_per_analysis,
            "estimated_spend_today_brl": estimated_spend_today,
            "user_message": (
                "Analises temporariamente indisponiveis hoje por alta demanda. "
                "Tente novamente em algumas horas."
            ),
        }

    if daily_budget_brl > 0 and cost_per_analysis > 0:
        projected = (usage_today + 1) * cost_per_analysis
        if projected > daily_budget_brl:
            return {
                "allowed": False,
                "reason": "budget_exceeded",
                "usage_today": usage_today,
                "daily_limit": daily_limit,
                "daily_budget_brl": daily_budget_brl,
                "estimated_cost_per_analysis_brl": cost_per_analysis,
                "estimated_spend_today_brl": estimated_spend_today,
                "user_message": (
                    "Analises temporariamente indisponiveis hoje por limite de capacidade. "
                    "Tente novamente mais tarde."
                ),
            }

    return {
        "allowed": True,
        "reason": None,
        "usage_today": usage_today,
        "daily_limit": daily_limit,
        "daily_budget_brl": daily_budget_brl,
        "estimated_cost_per_analysis_brl": cost_per_analysis,
        "estimated_spend_today_brl": estimated_spend_today,
    }
