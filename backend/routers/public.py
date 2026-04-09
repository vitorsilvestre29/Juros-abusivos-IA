from fastapi import APIRouter

from models import (
    PLAN_PUBLIC_IDS,
    PLAN_LABELS,
    PLAN_LIMITS,
    PLAN_BUDGET_USD,
    PLAN_PRICE_BRL,
    PLAN_TAGLINES,
    PLAN_FOR_WHOM,
)


router = APIRouter()


@router.get("/plans")
async def list_public_plans():
    """
    Lista pública de planos para a landing/tela de preços.
    Não exige autenticação.
    """
    return [
        {
            "id": pid,
            "label": PLAN_LABELS.get(pid, pid),
            "tagline": PLAN_TAGLINES.get(pid, ""),
            "for_whom": PLAN_FOR_WHOM.get(pid, ""),
            "limit_cases": PLAN_LIMITS.get(pid, 0),
            "budget_usd": PLAN_BUDGET_USD.get(pid, 0.0),
            "price_brl": PLAN_PRICE_BRL.get(pid, 0),
        }
        for pid in PLAN_PUBLIC_IDS
    ]

