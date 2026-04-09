from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import json

from database import get_db
from models import Contract, Analysis, AnalysisStatus, LOAN_TYPES
from routers.auth import get_current_user
from models import User
from services.analysis_service import run_full_analysis

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_FILE_MB = 20


@router.post("/upload")
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    loan_type: str = Form("credito_pessoal"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recebe o contrato (PDF ou imagem), salva no banco e dispara análise em background.
    Retorna contract_id e analysis_id para polling de status.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie PDF, JPG ou PNG.",
        )

    if loan_type not in LOAN_TYPES:
        loan_type = "credito_pessoal"

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Máximo: {MAX_FILE_MB}MB.",
        )

    file_type = "pdf" if "pdf" in file.content_type else "image"

    contract = Contract(
        user_id=current_user.id,
        filename=file.filename or "contrato",
        file_type=file_type,
        file_data=file_bytes,
        loan_type=loan_type,
    )
    db.add(contract)
    await db.flush()  # obtém o ID antes do commit

    analysis = Analysis(
        contract_id=contract.id,
        user_id=current_user.id,
        status=AnalysisStatus.PENDING,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(contract)
    await db.refresh(analysis)

    # Dispara análise em background (não bloqueia a resposta)
    background_tasks.add_task(
        run_full_analysis,
        contract_id=contract.id,
        analysis_id=analysis.id,
        file_bytes=file_bytes,
        file_type=file_type,
        loan_type=loan_type,
        user_email=current_user.email,
    )

    return {
        "contract_id": contract.id,
        "analysis_id": analysis.id,
        "status": AnalysisStatus.PENDING,
        "message": "Contrato recebido. Análise iniciada.",
    }


@router.get("/{contract_id}/status")
async def get_analysis_status(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Polling de status da análise.
    Quando status='completed', retorna o preview (has_issues, impact_brl, irregularities_count).
    O laudo completo só é liberado após pagamento.
    """
    result = await db.execute(
        select(Contract).where(
            Contract.id == contract_id,
            Contract.user_id == current_user.id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    analysis = contract.analysis
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    response: dict = {
        "contract_id": contract_id,
        "analysis_id": analysis.id,
        "status": analysis.status,
        "loan_type": contract.loan_type,
        "loan_type_label": LOAN_TYPES.get(contract.loan_type, contract.loan_type),
        "filename": contract.filename,
        "created_at": contract.created_at.isoformat(),
    }

    if analysis.status == AnalysisStatus.FAILED:
        response["error"] = analysis.error_message

    if analysis.status == AnalysisStatus.COMPLETED:
        # Preview público — sem revelar detalhes (paywall)
        response["has_issues"] = analysis.has_issues
        response["irregularities_count"] = analysis.irregularities_count
        response["impact_brl"] = analysis.impact_brl
        response["bcb_rate_pct"] = analysis.bcb_rate_pct

        # Se já pagou, sinaliza que pode baixar
        payment = analysis.payment
        if payment and payment.status == "paid":
            response["paid"] = True
            response["payment_id"] = payment.id
        else:
            response["paid"] = False

    return response


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Histórico de contratos analisados pelo usuário."""
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .order_by(Contract.created_at.desc())
    )
    contracts = result.scalars().all()

    items = []
    for c in contracts:
        item = {
            "contract_id": c.id,
            "filename": c.filename,
            "loan_type": c.loan_type,
            "loan_type_label": LOAN_TYPES.get(c.loan_type, c.loan_type),
            "created_at": c.created_at.isoformat(),
            "analysis_status": None,
            "has_issues": None,
            "impact_brl": None,
            "paid": False,
        }
        if c.analysis:
            item["analysis_id"] = c.analysis.id
            item["analysis_status"] = c.analysis.status
            item["has_issues"] = c.analysis.has_issues
            item["impact_brl"] = c.analysis.impact_brl
            if c.analysis.payment and c.analysis.payment.status == "paid":
                item["paid"] = True
        items.append(item)

    return items
