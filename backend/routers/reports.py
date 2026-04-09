from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from database import get_db
from models import Analysis, Payment, PaymentStatus, AnalysisStatus
from routers.auth import get_current_user
from models import User, LOAN_TYPES

router = APIRouter()


@router.get("/{analysis_id}/preview")
async def get_report_preview(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o preview do laudo (informações resumidas, sem detalhe completo).
    Disponível para qualquer análise concluída, mesmo sem pagamento.
    """
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Análise ainda não concluída")

    loan_label = LOAN_TYPES.get(
        analysis.contract.loan_type if analysis.contract else "",
        "Contrato de Crédito",
    )

    # Preview básico (sem detalhes das irregularidades)
    preview = {
        "analysis_id": analysis.id,
        "has_issues": analysis.has_issues,
        "irregularities_count": analysis.irregularities_count,
        "impact_brl": analysis.impact_brl,
        "bcb_rate_pct": analysis.bcb_rate_pct,
        "loan_type_label": loan_label,
        "filename": analysis.contract.filename if analysis.contract else "",
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
        "paid": False,
    }

    # Se já pagou, adiciona resumo público da análise
    if analysis.payment and analysis.payment.status == PaymentStatus.PAID:
        preview["paid"] = True
        if analysis.ai_result_json:
            ai = json.loads(analysis.ai_result_json)
            preview["banco_identificado"] = ai.get("banco_identificado", "")
            preview["resumo"] = ai.get("resumo_para_cliente", "")
            preview["recomendacao"] = ai.get("recomendacao", "")

    return preview


@router.get("/{analysis_id}/full")
async def get_full_report_json(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o laudo completo em JSON (apenas para análises pagas).
    Usado pelo frontend para exibir o relatório na tela.
    """
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if not analysis.payment or analysis.payment.status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=402,
            detail="Pagamento necessário para acessar o laudo completo",
        )

    if not analysis.ai_result_json:
        raise HTTPException(status_code=500, detail="Dados da análise não disponíveis")

    ai_result = json.loads(analysis.ai_result_json)

    return {
        "analysis_id": analysis.id,
        "loan_type": analysis.contract.loan_type if analysis.contract else "",
        "loan_type_label": LOAN_TYPES.get(
            analysis.contract.loan_type if analysis.contract else "", ""
        ),
        "bcb_rate_pct": analysis.bcb_rate_pct,
        "impact_brl": analysis.impact_brl,
        "irregularities_count": analysis.irregularities_count,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
        "report_generated_at": (
            analysis.report_generated_at.isoformat()
            if analysis.report_generated_at else None
        ),
        **ai_result,
    }


@router.get("/{analysis_id}/download")
async def download_report_pdf(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download do laudo em PDF (apenas para análises pagas).
    Se o PDF ainda não foi gerado, gera na hora.
    """
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if not analysis.payment or analysis.payment.status != PaymentStatus.PAID:
        raise HTTPException(
            status_code=402,
            detail="Pagamento necessário para baixar o laudo",
        )

    # Gera o PDF se ainda não existir
    if not analysis.report_pdf:
        if not analysis.ai_result_json:
            raise HTTPException(status_code=500, detail="Dados da análise indisponíveis")

        from services.report_service import generate_report_pdf
        ai_result = json.loads(analysis.ai_result_json)
        pdf_bytes = await generate_report_pdf(
            ai_result=ai_result,
            loan_type=analysis.contract.loan_type if analysis.contract else "credito_pessoal",
            bcb_rate_pct=analysis.bcb_rate_pct,
            impact_brl=analysis.impact_brl,
        )
        analysis.report_pdf = pdf_bytes
        from datetime import datetime
        analysis.report_generated_at = datetime.utcnow()
        await db.commit()

    filename = f"laudo_analise_{analysis_id}.pdf"
    return Response(
        content=analysis.report_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
