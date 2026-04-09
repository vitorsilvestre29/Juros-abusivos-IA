from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from pydantic import BaseModel
from typing import Optional
import json

from database import get_db
from models import Case, ChatMessage, Contract
from routers.auth import get_current_user
from models import User
from services.ai_service import chat_with_ai
from services.plan_service import accrue_cost, check_and_consume

router = APIRouter()


class MessageInput(BaseModel):
    content: str
    case_id: Optional[int] = None


class StartChatInput(BaseModel):
    case_type: Optional[str] = None


@router.post("/start")
async def start_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Inicia uma nova conversa criando um novo caso."""
    # Verifica e consome uma quota do plano antes de criar o caso
    await check_and_consume(current_user, db)

    case = Case(user_id=current_user.id, case_type="pendente", status="em_andamento")
    db.add(case)
    await db.commit()
    await db.refresh(case)

    # Mensagem de boas-vindas
    welcome_msg = f"""Olá! Bem-vindo(a) ao Portal Jurídico do Escritório. 👋

Sou seu assistente jurídico especializado em **direito bancário e consumidor**. Estou aqui para te guiar em cada etapa do processamento do caso.

Vamos começar! Qual é o tipo de caso do seu cliente?

1. **Empréstimo CLT (desconto em folha)** — análise de juros abusivos e outras violações bancárias
2. **Empréstimo Bancário Direto** — crédito pessoal contratado diretamente com bancos (juros abusivos, tarifas e seguros indevidos)
3. **Área da Saúde** — plano de saúde, negativa de cobertura, etc.

Antes de fechar qualquer conclusão, vou confirmar com você o tipo exato do empréstimo e o objetivo da análise.

Digite o número ou descreva o caso com suas palavras."""

    # Salva a mensagem do assistente
    ai_message = ChatMessage(case_id=case.id, role="assistant", content=welcome_msg)
    db.add(ai_message)
    await db.commit()

    return {
        "case_id": case.id,
        "message": welcome_msg
    }


@router.get("/{case_id}/messages")
async def get_messages(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna todas as mensagens de um caso."""
    # Verifica acesso
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    msgs_result = await db.execute(
        select(ChatMessage).where(ChatMessage.case_id == case_id).order_by(asc(ChatMessage.created_at))
    )
    messages = msgs_result.scalars().all()

    return [{"role": m.role, "content": m.content, "id": m.id} for m in messages]


@router.post("/{case_id}/message")
async def send_message(
    case_id: int,
    message_input: MessageInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Envia uma mensagem e recebe resposta da IA."""
    # Verifica acesso
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Salva mensagem do usuário
    user_msg = ChatMessage(case_id=case_id, role="user", content=message_input.content)
    db.add(user_msg)
    await db.commit()

    # Busca histórico de mensagens
    msgs_result = await db.execute(
        select(ChatMessage).where(ChatMessage.case_id == case_id).order_by(asc(ChatMessage.created_at))
    )
    all_messages = msgs_result.scalars().all()

    # Monta contexto do caso
    contracts_result = await db.execute(select(Contract).where(Contract.case_id == case_id))
    contracts = contracts_result.scalars().all()

    case_context = {
        "case_id": case_id,
        "case_type": case.case_type,
        "client_name": case.client_name,
        "client_cpf": case.client_cpf,
        "client_address": case.client_address,
        "contracts_uploaded": len(contracts),
        "contracts_analyzed": [
            {
                "bank": c.bank_name,
                "analysis": json.loads(c.analysis) if c.analysis else None
            }
            for c in contracts
        ]
    }

    # Prepara mensagens para o Claude
    claude_messages = [
        {"role": m.role, "content": m.content}
        for m in all_messages
    ]

    # Obtém resposta da IA
    ai_response, chat_cost = await chat_with_ai(claude_messages, case_context)

    # Salva resposta da IA
    ai_msg = ChatMessage(case_id=case_id, role="assistant", content=ai_response)
    db.add(ai_msg)

    # Acumula custo real de chat no caso e no usuário
    await accrue_cost(case, current_user, chat_cost, db)

    # Atualiza tipo do caso se identificado na conversa
    content_lower = message_input.content.lower()
    if case.case_type == "pendente":
        if any(word in content_lower for word in ["clt", "trabalhador", "folha", "desconto em folha", "1"]):
            case.case_type = "clt"
        elif any(word in content_lower for word in ["bancário", "bancario", "banco", "crédito", "credito", "pessoal", "direto", "2"]):
            case.case_type = "bancario_direto"
        elif any(word in content_lower for word in ["saúde", "plano", "hospital", "3"]):
            case.case_type = "saude"

    await db.commit()

    return {"role": "assistant", "content": ai_response}
