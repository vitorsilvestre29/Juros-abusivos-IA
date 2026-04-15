from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime
import json

from database import get_db
from models import Contract, Analysis, AnalysisStatus, LOAN_TYPES
from routers.auth import get_current_user, get_current_user_optional, create_guest_user
from models import User
from services.analysis_service import run_pre_analysis
from services.ai_ops_service import check_ai_capacity
from services.ops_alert_service import send_ops_alert

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
}
MAX_FILE_MB = 20
CONTRACT_TYPE_MISMATCH_CODE = "contract_type_mismatch"


@router.post("/upload")
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    loan_type: str = Form("credito_pessoal"),
    user_phone: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    access_token = None
    if current_user is None:
        current_user, access_token = await create_guest_user(db)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Formato invalido. Envie apenas PDF. "
                "Para maior precisao, prefira o PDF original do banco "
                "(PDF escaneado pode reduzir a qualidade da analise)."
            ),
        )

    if loan_type not in LOAN_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Tipo de contrato invalido.",
        )

    capacity = await check_ai_capacity(db)
    if not capacity.get("allowed", True):
        await send_ops_alert(
            event="ai_capacity_blocked",
            message="Nova analise bloqueada por politica de capacidade diaria da IA.",
            metadata={
                "reason": capacity.get("reason"),
                "usage_today": capacity.get("usage_today"),
                "daily_limit": capacity.get("daily_limit"),
                "daily_budget_brl": capacity.get("daily_budget_brl"),
                "estimated_cost_per_analysis_brl": capacity.get("estimated_cost_per_analysis_brl"),
            },
        )
        raise HTTPException(
            status_code=503,
            detail=capacity.get(
                "user_message",
                "Analises temporariamente indisponiveis. Tente novamente mais tarde.",
            ),
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Arquivo muito grande. Maximo: {MAX_FILE_MB}MB.",
        )

    file_type = "pdf" if "pdf" in file.content_type else "image"

    contract = Contract(
        user_id=current_user.id,
        filename=file.filename or "contrato",
        file_type=file_type,
        file_data=file_bytes,
        loan_type=loan_type,
        user_phone=user_phone.strip() if user_phone else None,
    )
    db.add(contract)
    await db.flush()

    analysis = Analysis(
        contract_id=contract.id,
        user_id=current_user.id,
        status=AnalysisStatus.PENDING,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(contract)
    await db.refresh(analysis)

    background_tasks.add_task(
        run_pre_analysis,
        contract_id=contract.id,
        analysis_id=analysis.id,
        file_bytes=file_bytes,
        file_type=file_type,
        loan_type=loan_type,
    )

    return {
        "contract_id": contract.id,
        "analysis_id": analysis.id,
        "status": AnalysisStatus.PENDING,
        "message": "Contrato recebido. Analise iniciada.",
        "access_token": access_token,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "is_guest": current_user.email.endswith("@guest.local"),
    }


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .options(selectinload(Contract.analysis).selectinload(Analysis.payment))
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


@router.get("/{contract_id}/status")
async def get_analysis_status(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Contract)
        .where(
            Contract.id == contract_id,
            Contract.user_id == current_user.id,
        )
        .options(selectinload(Contract.analysis).selectinload(Analysis.payment))
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato nao encontrado")

    analysis = contract.analysis
    if not analysis:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")

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
        if analysis.error_message and "tipo de contrato selecionado nao confere" in analysis.error_message.lower():
            response["error_code"] = CONTRACT_TYPE_MISMATCH_CODE
            response["retryable"] = False
        else:
            response["retryable"] = True
    elif analysis.error_message:
        response["warning_message"] = (
            "Identificamos divergencias no contrato. "
            "O laudo tecnico completo com todos os detalhes e fundamentos fica disponivel apos o pagamento."
        )

    if analysis.status == AnalysisStatus.COMPLETED:
        response["has_issues"] = analysis.has_issues
        response["irregularities_count"] = analysis.irregularities_count
        response["impact_brl"] = analysis.impact_brl
        response["bcb_rate_pct"] = analysis.bcb_rate_pct

        payment = analysis.payment
        if payment and payment.status == "paid":
            response["paid"] = True
            response["payment_id"] = payment.id
        else:
            response["paid"] = False

    return response
