from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime
import asyncio
import os
import json

from database import get_db
from models import Analysis, Payment, PaymentStatus, AnalysisStatus
from routers.auth import get_current_user
from models import User
from services.payment_service import create_pix_payment
from services.ops_alert_service import send_ops_alert
from services.report_service import generate_report_pdf
from services.analysis_service import run_full_analysis

router = APIRouter()


def _admin_bypass_emails() -> set[str]:
    raw = os.getenv("ADMIN_BYPASS_EMAILS", "")
    emails = {
        part.strip().lower()
        for part in raw.split(",")
        if part and part.strip()
    }
    return emails


def _is_admin_bypass_user(user: User) -> bool:
    user_email = str(getattr(user, "email", "") or "").strip().lower()
    if not user_email:
        return False
    return user_email in _admin_bypass_emails()


def _is_admin_bypass_payment(payment: Payment | None) -> bool:
    if not payment:
        return False
    mp_payment_id = str(getattr(payment, "mp_payment_id", "") or "")
    return mp_payment_id.startswith("admin_bypass_paid_")


@router.post("/create/{analysis_id}")
async def create_payment(
    analysis_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria um pagamento PIX via Mercado Pago para liberar o laudo completo.
    Retorna QR Code e código copia-e-cola.
    """
    # Verifica se a análise existe e pertence ao usuário
    result = await db.execute(
        select(Analysis)
        .where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
        .options(selectinload(Analysis.payment))
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Análise ainda não concluída")

    mock_mode = os.getenv("MOCK_MODE", "false").lower() == "true"
    admin_bypass = _is_admin_bypass_user(current_user)

    # Verifica se já existe pagamento pago
    if analysis.payment and analysis.payment.status == PaymentStatus.PAID:
        return {
            "message": "Laudo já pago",
            "payment_id": analysis.payment.id,
            "status": "paid",
            "is_bypass": _is_admin_bypass_payment(analysis.payment),
        }

    # Bypass premium restrito a e-mails administrativos (whitelist via env).
    if admin_bypass:
        amount = float(os.getenv("REPORT_PRICE", "4.99"))

        if analysis.payment and analysis.payment.status == PaymentStatus.PENDING:
            analysis.payment.status = PaymentStatus.PAID
            analysis.payment.paid_at = datetime.utcnow()
            if not analysis.payment.mp_payment_id:
                analysis.payment.mp_payment_id = f"admin_bypass_paid_{analysis_id}"
            await db.commit()

            await send_ops_alert(
                event="admin_bypass_payment_used",
                message="Pagamento bypass aplicado para usuario administrativo.",
                metadata={
                    "analysis_id": analysis_id,
                    "user_email": current_user.email,
                },
            )

            background_tasks.add_task(_generate_full_report_after_payment, analysis_id)
            return {
                "payment_id": analysis.payment.id,
                "status": "paid",
                "analysis_id": analysis_id,
                "amount_brl": analysis.payment.amount_brl,
                "is_bypass": True,
            }

        payment = Payment(
            user_id=current_user.id,
            analysis_id=analysis_id,
            amount_brl=amount,
            status=PaymentStatus.PAID,
            mp_payment_id=f"admin_bypass_paid_{analysis_id}",
            paid_at=datetime.utcnow(),
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        await send_ops_alert(
            event="admin_bypass_payment_used",
            message="Pagamento bypass aplicado para usuario administrativo.",
            metadata={
                "analysis_id": analysis_id,
                "user_email": current_user.email,
            },
        )

        background_tasks.add_task(_generate_full_report_after_payment, analysis_id)
        return {
            "payment_id": payment.id,
            "status": "paid",
            "analysis_id": analysis_id,
            "amount_brl": payment.amount_brl,
            "is_bypass": True,
        }

    # Em modo teste, pulamos o PIX e liberamos o laudo automaticamente.
    if mock_mode:
        if analysis.payment and analysis.payment.status == PaymentStatus.PENDING:
            analysis.payment.status = PaymentStatus.PAID
            analysis.payment.paid_at = datetime.utcnow()
            await db.commit()
            background_tasks.add_task(_generate_full_report_after_payment, analysis_id)
            return {
                "payment_id": analysis.payment.id,
                "status": "paid",
                "analysis_id": analysis_id,
                "amount_brl": analysis.payment.amount_brl,
                "is_bypass": False,
            }

        amount = float(os.getenv("REPORT_PRICE", "4.99"))
        payment = Payment(
            user_id=current_user.id,
            analysis_id=analysis_id,
            amount_brl=amount,
            status=PaymentStatus.PAID,
            mp_payment_id=f"mock_paid_{analysis_id}",
            paid_at=datetime.utcnow(),
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        background_tasks.add_task(_generate_full_report_after_payment, analysis_id)
        return {
            "payment_id": payment.id,
            "status": "paid",
            "analysis_id": analysis_id,
            "amount_brl": payment.amount_brl,
            "is_bypass": False,
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
            "is_bypass": False,
        }

    amount = float(os.getenv("REPORT_PRICE", "4.99"))

    try:
        mp_data = await create_pix_payment(
            amount=amount,
            user_email=current_user.email,
            user_name=current_user.name,
            description="Laudo Técnico — Análise de Abusividades em Contrato de Crédito",
            analysis_id=analysis_id,
            mock=mock_mode,
        )
    except Exception as e:
        await send_ops_alert(
            event="payment_create_failed",
            message="Falha ao criar pagamento no Mercado Pago.",
            metadata={
                "analysis_id": analysis_id,
                "raw_error": str(e)[:300],
            },
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "Pagamento indisponivel no momento. "
                "Verifique a configuracao do Mercado Pago e tente novamente."
            ),
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
        "is_bypass": False,
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
        "is_bypass": _is_admin_bypass_payment(payment),
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

    # Gera analise completa + PDF em background
    background_tasks.add_task(_generate_full_report_after_payment, payment.analysis_id)

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

    background_tasks.add_task(_generate_full_report_after_payment, payment.analysis_id)

    return {"message": "Pagamento confirmado (mock)", "analysis_id": payment.analysis_id}


async def _generate_full_report_after_payment(analysis_id: int):
    """Pos-pagamento: executa analise completa premium e gera o PDF."""
    from database import AsyncSessionLocal

    timeout_seconds = int(os.getenv("FULL_ANALYSIS_TIMEOUT_SECONDS", "240"))

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Analysis)
            .where(Analysis.id == analysis_id)
            .options(selectinload(Analysis.contract))
        )
        analysis = result.scalar_one_or_none()
        if not analysis or not analysis.contract:
            return

        try:
            # Executa analise completa apenas apos pagamento.
            if not analysis.ai_result_json:
                user_result = await db.execute(select(User).where(User.id == analysis.user_id))
                user = user_result.scalar_one_or_none()
                try:
                    await asyncio.wait_for(
                        run_full_analysis(
                            contract_id=analysis.contract_id,
                            analysis_id=analysis.id,
                            file_bytes=analysis.contract.file_data,
                            file_type=analysis.contract.file_type,
                            loan_type=analysis.contract.loan_type,
                            user_email=user.email if user else "",
                            user_phone=analysis.contract.user_phone or "",
                        ),
                        timeout=timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    analysis.status = AnalysisStatus.FAILED
                    analysis.error_message = (
                        "A analise premium demorou mais que o limite permitido. "
                        "Tente novamente em alguns minutos."
                    )
                    await db.commit()
                    await send_ops_alert(
                        event="post_payment_analysis_timeout",
                        message="Timeout na analise premium apos pagamento.",
                        metadata={
                            "analysis_id": analysis_id,
                            "timeout_seconds": timeout_seconds,
                        },
                    )
                    return

                reload_result = await db.execute(
                    select(Analysis)
                    .where(Analysis.id == analysis_id)
                    .options(selectinload(Analysis.contract))
                )
                analysis = reload_result.scalar_one_or_none()
                if not analysis:
                    return

            if not analysis.ai_result_json:
                if analysis.status != AnalysisStatus.FAILED:
                    analysis.status = AnalysisStatus.FAILED
                    analysis.error_message = (
                        "Nao foi possivel concluir a analise premium apos o pagamento. "
                        "Tente novamente em alguns minutos."
                    )
                    await db.commit()
                return
            if analysis.report_pdf:
                return

            ai_result = json.loads(analysis.ai_result_json)
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
            print(f"Erro no pos-pagamento da analise {analysis_id}: {e}")
