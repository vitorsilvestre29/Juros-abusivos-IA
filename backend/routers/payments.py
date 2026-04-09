from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import os
import json

from database import get_db
from models import Analysis, Payment, PaymentStatus, AnalysisStatus
from routers.auth import get_current_user
from models import User
from services.payment_service import create_pix_payment
from services.report_service import generate_report_pdf

router = APIRouter()


@router.post("/create/{analysis_id}")
async def create_payment(
    analysis_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria um pagamento PIX via Mercado Pago para liberar o laudo completo.
    Retorna QR Code e código copia-e-cola.
    """
    # Verifica se a análise existe e pertence ao usuário
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

    # Verifica se já existe pagamento pago
    if analysis.payment and analysis.payment.status == PaymentStatus.PAID:
        return {
            "message": "Laudo já pago",
            "payment_id": analysis.payment.id,
            "status": "paid",
        }

    # Verifica se já existe pagamento pendente (reutiliza o QR)
    if analysis.payment and analysis.payment.status == PaymentStatus.PENDING:
        p = analysis.payment
        return {
            "payment_id": p.id,
            "status": p.status,
            "amount_brl": p.amount_brl,
            "qr_code": p.mp_qr_code,
            "qr_code_base64": p.mp_qr_code_base64,
            "ticket_url": p.mp_ticket_url,
            "expires_at": p.expires_at.isoformat() if p.expires_at else None,
        }

    amount = float(os.getenv("REPORT_PRICE", "97.00"))
    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"

    mp_data = await create_pix_payment(
        amount=amount,
        user_email=current_user.email,
        user_name=current_user.name,
        description="Laudo Técnico — Análise de Abusividades em Contrato de Crédito",
        analysis_id=analysis_id,
        mock=mock_mode,
    )

    payment = Payment(
        user_id=current_user.id,
        analysis_id=analysis_id,
        amount_brl=amount,
        status=PaymentStatus.PENDING,
        mp_payment_id=mp_data.get("payment_id"),
        mp_qr_code=mp_data.get("qr_code"),
        mp_qr_code_base64=mp_data.get("qr_code_base64"),
        mp_ticket_url=mp_data.get("ticket_url"),
        expires_at=mp_data.get("expires_at"),
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "payment_id": payment.id,
        "status": payment.status,
        "amount_brl": payment.amount_brl,
        "qr_code": payment.mp_qr_code,
        "qr_code_base64": payment.mp_qr_code_base64,
        "ticket_url": payment.mp_ticket_url,
        "expires_at": payment.expires_at.isoformat() if payment.expires_at else None,
    }


@router.get("/{payment_id}/status")
async def check_payment_status(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Polling de status do pagamento. Quando 'paid', o laudo está disponível."""
    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.user_id == current_user.id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    return {
        "payment_id": payment.id,
        "status": payment.status,
        "analysis_id": payment.analysis_id,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
    }


@router.post("/webhook/mercadopago")
async def mercadopago_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook do Mercado Pago.
    Quando o pagamento é aprovado: marca como pago e gera o laudo PDF.
    """
    try:
        body = await request.json()
    except Exception:
        return {"ok": True}

    # MP envia evento do tipo "payment"
    if body.get("type") != "payment":
        return {"ok": True}

    mp_payment_id = str(body.get("data", {}).get("id", ""))
    if not mp_payment_id:
        return {"ok": True}

    # Verifica se o pagamento no MP está aprovado
    from services.payment_service import get_payment_status_mp
    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"
    mp_status = await get_payment_status_mp(mp_payment_id, mock=mock_mode)

    if mp_status != "approved":
        return {"ok": True}

    # Encontra o pagamento no banco
    result = await db.execute(
        select(Payment).where(Payment.mp_payment_id == mp_payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment or payment.status == PaymentStatus.PAID:
        return {"ok": True}

    # Marca como pago
    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()
    await db.commit()

    # Gera o PDF em background
    background_tasks.add_task(_generate_pdf_after_payment, payment.analysis_id)

    return {"ok": True}


@router.post("/confirm-mock/{payment_id}")
async def confirm_mock_payment(
    payment_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirma pagamento manualmente (apenas em MOCK_MODE).
    Útil para testar o fluxo completo sem pagar de verdade.
    """
    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"
    if not mock_mode:
        raise HTTPException(status_code=403, detail="Endpoint disponível apenas em MOCK_MODE")

    result = await db.execute(
        select(Payment).where(
            Payment.id == payment_id,
            Payment.user_id == current_user.id,
        )
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado")

    payment.status = PaymentStatus.PAID
    payment.paid_at = datetime.utcnow()
    await db.commit()

    background_tasks.add_task(_generate_pdf_after_payment, payment.analysis_id)

    return {"message": "Pagamento confirmado (mock)", "analysis_id": payment.analysis_id}


async def _generate_pdf_after_payment(analysis_id: int):
    """Gera o PDF do laudo e salva no banco após confirmação do pagamento."""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis or not analysis.ai_result_json:
            return
        if analysis.report_pdf:
            return  # já gerado

        try:
            ai_result = json.loads(analysis.ai_result_json)

            # Busca dados do contrato para o relatório
            contract_result = await db.execute(
                select(Analysis).where(Analysis.id == analysis_id)
            )
            # Gera o PDF
            pdf_bytes = await generate_report_pdf(
                ai_result=ai_result,
                loan_type=analysis.contract.loan_type if analysis.contract else "credito_pessoal",
                bcb_rate_pct=analysis.bcb_rate_pct,
                impact_brl=analysis.impact_brl,
            )

            analysis.report_pdf = pdf_bytes
            analysis.report_generated_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            print(f"Erro ao gerar PDF para análise {analysis_id}: {e}")
