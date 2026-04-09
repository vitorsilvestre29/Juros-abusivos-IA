"""
Serviço de controle de planos, cotas e custo real de API.

Fluxo:
  Ao criar um caso → check_and_consume(user, db)   [bloqueia por caso ou budget]
  A cada chamada IA → accrue_cost(case, user, cost, db)  [acumula gasto real]

Limites duplos:
  1. Nº de casos/mês  (evita criação abusiva de casos vazios)
  2. Budget USD/mês   (limite real baseado no custo efetivo de tokens)

Cenário pesado (padrão real): 2 contratos escaneados + 20 msgs + 3 docs ≈ $0,30/caso
"""

from datetime import date
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, Case, PLAN_LIMITS, PLAN_BUDGET_USD, PLAN_LABELS, PLAN_PRICE_BRL

USD_TO_BRL = 5.75  # atualizar conforme câmbio


def _next_reset_date(from_date: date) -> date:
    year, month = from_date.year, from_date.month + 1
    if month > 12:
        month, year = 1, year + 1
    return date(year, month, 1)


def _should_reset(user: User) -> bool:
    if user.plan_reset_at is None:
        return True
    return date.today() >= user.plan_reset_at


def _do_reset(user: User) -> None:
    """Zera contadores mensais e agenda próximo reset."""
    user.cases_used_this_month = 0
    user.api_cost_this_month_usd = 0.0
    user.plan_reset_at = _next_reset_date(date.today())


def get_plan_status(user: User) -> dict:
    """Resumo do plano sem alterar o banco."""
    if user.role == "admin":
        return {
            "plan": "admin",
            "plan_label": "Admin (sem limite interno)",
            "plan_price_brl": 0,
            "limit_cases": 999_999,
            "budget_usd": 999_999.0,
            "cases_used": 0,
            "cost_used_usd": 0.0,
            "cost_used_brl": 0.0,
            "cases_remaining": 999_999,
            "budget_remaining_usd": 999_999.0,
            "budget_remaining_brl": 0.0,
            "reset_at": None,
        }

    reset = _should_reset(user)
    cases_used = 0 if reset else user.cases_used_this_month
    cost_used  = 0.0 if reset else user.api_cost_this_month_usd

    limit_cases  = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["trial"])
    budget_usd   = PLAN_BUDGET_USD.get(user.plan, PLAN_BUDGET_USD["trial"])
    price_brl    = PLAN_PRICE_BRL.get(user.plan, 0)

    return {
        "plan":               user.plan,
        "plan_label":         PLAN_LABELS.get(user.plan, user.plan),
        "plan_price_brl":     price_brl,
        "limit_cases":        limit_cases,
        "budget_usd":         budget_usd,
        "cases_used":         cases_used,
        "cost_used_usd":      round(cost_used, 4),
        "cost_used_brl":      round(cost_used * USD_TO_BRL, 2),
        "cases_remaining":    max(0, limit_cases - cases_used),
        "budget_remaining_usd": round(max(0.0, budget_usd - cost_used), 4),
        "budget_remaining_brl": round(max(0.0, (budget_usd - cost_used) * USD_TO_BRL), 2),
        "reset_at":           user.plan_reset_at.isoformat() if user.plan_reset_at else None,
    }


async def check_and_consume(user: User, db: AsyncSession) -> None:
    """
    Verifica se o usuário pode criar um novo caso.
    Bloqueia com HTTP 402 se:
      - ultrapassou o nº de casos do plano, OU
      - ultrapassou o budget mensal de USD
    Admin nunca é bloqueado.
    """
    if user.role == "admin":
        return

    if _should_reset(user):
        _do_reset(user)

    limit_cases = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["trial"])
    budget_usd  = PLAN_BUDGET_USD.get(user.plan, PLAN_BUDGET_USD["trial"])
    label       = PLAN_LABELS.get(user.plan, user.plan)
    price_brl   = PLAN_PRICE_BRL.get(user.plan, 0)

    # Limite de casos (proteção contra criação massiva)
    if user.cases_used_this_month >= limit_cases:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Limite de casos atingido. Plano {label}: {limit_cases} casos/mês. "
                f"Você usou {user.cases_used_this_month}. "
                f"Entre em contato para upgrade."
            )
        )

    # Limite de budget (limite real — evita prejuízo)
    if user.api_cost_this_month_usd >= budget_usd:
        cost_brl = round(user.api_cost_this_month_usd * USD_TO_BRL, 2)
        budget_brl = round(budget_usd * USD_TO_BRL, 2)
        raise HTTPException(
            status_code=402,
            detail=(
                f"Budget mensal de API atingido. Plano {label}: "
                f"R$ {budget_brl:.2f}/mês de custo de IA. "
                f"Você utilizou R$ {cost_brl:.2f} este mês. "
                f"Entre em contato para upgrade."
            )
        )

    user.cases_used_this_month += 1
    await db.commit()


async def accrue_cost(case: Case, user: User, cost_usd: float, db: AsyncSession) -> None:
    """
    Acumula custo real de uma chamada de IA:
      - no caso (case.api_cost_usd)
      - no usuário (user.api_cost_this_month_usd)
    Não bloqueia — apenas registra. O bloqueio acontece em check_and_consume.
    """
    if cost_usd <= 0:
        return
    case.api_cost_usd = (case.api_cost_usd or 0.0) + cost_usd
    user.api_cost_this_month_usd = (user.api_cost_this_month_usd or 0.0) + cost_usd
    await db.commit()
