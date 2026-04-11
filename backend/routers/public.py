from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models import LOAN_TYPES, Analysis, Contract
from database import get_db
import os, json


router = APIRouter()


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

