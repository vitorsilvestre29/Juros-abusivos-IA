from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from models import LOAN_TYPES, Analysis, Contract, AnalysisTelemetry
from database import get_db
import os, json


router = APIRouter()


def _require_ops_key(x_ops_key: str | None):
    expected = os.getenv("OPS_METRICS_KEY", "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="OPS_METRICS_KEY nao configurada no backend.",
        )
    if (x_ops_key or "").strip() != expected:
        raise HTTPException(status_code=401, detail="Acesso nao autorizado.")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/loan-types")
async def list_loan_types():
    """Retorna os tipos de emprestimo disponiveis para analise."""
    return [{"id": k, "label": v} for k, v in LOAN_TYPES.items()]


@router.get("/pricing")
async def pricing():
    """Retorna o preco do laudo."""
    price = float(os.getenv("REPORT_PRICE", "9.99"))
    return {
        "price_brl": price,
        "description": "Laudo Tecnico Completo de Analise de Abusividades",
        "includes": [
            "Analise completa de todas as clausulas do contrato",
            "Comparacao com taxas medias do Banco Central",
            "Identificacao de irregularidades com fundamento legal",
            "Calculo do impacto financeiro",
            "Laudo em PDF pronto para advogado",
            "Indicacao de acao revisional quando aplicavel",
        ],
    }

@router.get("/ranking")
async def get_ranking(db: AsyncSession = Depends(get_db)):
    """Retorna ranking de tipos de contrato com mais irregularidades."""
    try:
        result = await db.execute(
            select(Contract.loan_type, func.count(Analysis.id).label("total"),
                   func.sum(Analysis.impact_brl).label("impact_total"))
            .join(Contract, Analysis.contract_id == Contract.id)
            .where(Analysis.has_issues == True)
            .where(Analysis.status == "completed")
            .group_by(Contract.loan_type)
            .order_by(func.count(Analysis.id).desc())
            .limit(10)
        )
        rows = result.fetchall()
        total_analyses = sum(r.total for r in rows) if rows else 1
        return [
            {
                "loan_type": r.loan_type,
                "label": LOAN_TYPES.get(r.loan_type, r.loan_type),
                "total_issues": r.total,
                "pct": round(r.total / total_analyses * 100, 1),
                "impact_total": round(r.impact_total or 0, 2),
            }
            for r in rows
        ]
    except Exception as e:
        print("Ranking error:", e)
        # Fallback com dados ilustrativos quando DB vazio
        return [
            {"loan_type": "cartao_credito", "label": "Cartao de Credito", "total_issues": 0, "pct": 0, "impact_total": 0},
            {"loan_type": "credito_pessoal", "label": "Credito Pessoal", "total_issues": 0, "pct": 0, "impact_total": 0},
        ]

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Retorna estatisticas gerais da plataforma."""
    try:
        total = await db.execute(select(func.count(Analysis.id)).where(Analysis.status == "completed"))
        total_analyses = total.scalar() or 0
        with_issues = await db.execute(
            select(func.count(Analysis.id)).where(Analysis.has_issues == True).where(Analysis.status == "completed")
        )
        total_issues = with_issues.scalar() or 0
        impact = await db.execute(
            select(func.sum(Analysis.impact_brl)).where(Analysis.has_issues == True)
        )
        total_impact = round(impact.scalar() or 0, 2)
        return {
            "total_analyses": total_analyses,
            "total_with_issues": total_issues,
            "pct_with_issues": round(total_issues / total_analyses * 100, 1) if total_analyses > 0 else 0,
            "total_impact_brl": total_impact,
        }
    except Exception as e:
        return {"total_analyses": 0, "total_with_issues": 0, "pct_with_issues": 0, "total_impact_brl": 0}


@router.get("/ops/ai-metrics")
async def get_ai_metrics(
    days: int = 7,
    x_ops_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Metricas operacionais da IA para ajuste de custo x qualidade.
    Protegido por header: X-Ops-Key (OPS_METRICS_KEY no backend).
    """
    _require_ops_key(x_ops_key)

    if days < 1:
        days = 1
    if days > 30:
        days = 30

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    period_start = today_start - timedelta(days=days - 1)

    base = select(AnalysisTelemetry).where(AnalysisTelemetry.created_at >= period_start)
    rows_result = await db.execute(base)
    rows = rows_result.scalars().all()

    total = len(rows)
    completed = [r for r in rows if r.status == "completed"]
    failed = [r for r in rows if r.status == "failed"]

    def _sum(field: str, items: list[AnalysisTelemetry]) -> float:
        return float(sum(float(getattr(x, field) or 0.0) for x in items))

    def _avg(field: str, items: list[AnalysisTelemetry]) -> float:
        if not items:
            return 0.0
        return round(_sum(field, items) / len(items), 6)

    by_token_bucket: dict[int, list[AnalysisTelemetry]] = {}
    for row in rows:
        key = int(row.max_output_tokens or 0)
        by_token_bucket.setdefault(key, []).append(row)

    cohorts = []
    for max_tokens, items in sorted(by_token_bucket.items(), key=lambda x: x[0]):
        total_items = len(items)
        failed_items = len([i for i in items if i.status == "failed"])
        cohorts.append({
            "max_output_tokens": max_tokens,
            "total": total_items,
            "failed": failed_items,
            "failure_rate_pct": round((failed_items / total_items) * 100, 2) if total_items else 0.0,
            "avg_input_tokens": _avg("input_tokens", items),
            "avg_output_tokens": _avg("output_tokens", items),
            "avg_cost_brl": _avg("estimated_cost_brl", items),
            "avg_duration_ms": _avg("duration_ms", items),
        })

    return {
        "period_days": days,
        "from_utc": period_start.isoformat(),
        "to_utc": now.isoformat(),
        "totals": {
            "analyses": total,
            "completed": len(completed),
            "failed": len(failed),
            "failure_rate_pct": round((len(failed) / total) * 100, 2) if total else 0.0,
            "sum_cost_brl": round(_sum("estimated_cost_brl", rows), 6),
            "sum_cost_usd": round(_sum("estimated_cost_usd", rows), 6),
            "avg_cost_brl": _avg("estimated_cost_brl", rows),
            "avg_input_tokens": _avg("input_tokens", rows),
            "avg_output_tokens": _avg("output_tokens", rows),
            "avg_duration_ms": _avg("duration_ms", rows),
        },
        "cohorts_by_max_output_tokens": cohorts,
    }
