from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import json
import os

from database import get_db
from models import Case, Contract, Document, ChatMessage
from routers.auth import get_current_user
from models import User
from services.ai_service import generate_parecer_tecnico, generate_peticao_inicial, generate_procuracao_text
from services.doc_generator import generate_parecer_docx, generate_procuracao_docx, generate_peticao_docx
from services.plan_service import accrue_cost

router = APIRouter()

DOCS_DIR = "documents"
os.makedirs(DOCS_DIR, exist_ok=True)


def _write_bytes_to_file(path: str, data: bytes) -> None:
    with open(path, "wb") as f:
        f.write(data)


class GenerateDocRequest(BaseModel):
    doc_type: str  # parecer, procuracao, peticao
    additional_data: Optional[dict] = None


@router.post("/{case_id}/generate")
async def generate_document(
    case_id: int,
    request: GenerateDocRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Gera um documento para o caso."""
    # Verifica acesso ao caso
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Busca contratos analisados
    contracts_result = await db.execute(select(Contract).where(Contract.case_id == case_id))
    contracts = contracts_result.scalars().all()

    if not contracts:
        raise HTTPException(status_code=400, detail="Nenhum contrato foi enviado para este caso. Faça o upload primeiro.")

    contracts_analysis = []
    for c in contracts:
        if c.analysis:
            try:
                contracts_analysis.append(json.loads(c.analysis))
            except json.JSONDecodeError:
                pass

    case_data = {
        "client_name": case.client_name or "Cliente",
        "client_cpf": case.client_cpf or "Não informado",
        "client_address": case.client_address or "Não informado",
        "case_type": case.case_type,
        **(request.additional_data or {})
    }

    doc_bytes = None
    filename = ""

    doc_cost = 0.0

    if request.doc_type == "parecer":
        parecer_text, doc_cost = await generate_parecer_tecnico(case_data, contracts_analysis)
        doc_bytes = await run_in_threadpool(generate_parecer_docx, case_data, parecer_text)
        filename = f"Parecer_Tecnico_{case_data['client_name'].replace(' ', '_')}.docx"

    elif request.doc_type == "procuracao":
        doc_bytes = await run_in_threadpool(generate_procuracao_docx, case_data)
        filename = f"Procuracao_{case_data['client_name'].replace(' ', '_')}.docx"

    elif request.doc_type == "peticao":
        peticao_text, doc_cost = await generate_peticao_inicial(case_data, contracts_analysis, "")
        doc_bytes = await run_in_threadpool(generate_peticao_docx, case_data, peticao_text)
        filename = f"Peticao_Inicial_{case_data['client_name'].replace(' ', '_')}.docx"

    else:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido. Use: parecer, procuracao ou peticao")

    # Salva o arquivo
    file_path = os.path.join(DOCS_DIR, f"case_{case_id}_{filename}")
    await run_in_threadpool(_write_bytes_to_file, file_path, doc_bytes)

    # Registra no banco
    doc_record = Document(
        case_id=case_id,
        doc_type=request.doc_type,
        filename=filename,
        file_path=file_path
    )
    db.add(doc_record)

    # Persiste mensagem de geração no chat
    doc_labels = {"parecer": "Parecer Técnico", "procuracao": "Procuração Ad Judicia", "peticao": "Petição Inicial"}
    label = doc_labels.get(request.doc_type, request.doc_type)
    gen_msg = ChatMessage(
        case_id=case_id,
        role="assistant",
        content=f"✅ **{label}** gerado com sucesso!\n\nVocê pode baixar o documento no painel lateral clicando em **\"Documentos\"**. O arquivo está pronto para revisão e assinatura."
    )
    db.add(gen_msg)

    # Acumula custo do documento no caso e no usuário
    if doc_cost > 0:
        await accrue_cost(case, current_user, doc_cost, db)

    await db.commit()
    await db.refresh(doc_record)

    return {
        "document_id": doc_record.id,
        "filename": filename,
        "doc_type": request.doc_type,
        "message": "Documento gerado com sucesso"
    }


@router.get("/{case_id}/download/{doc_id}")
async def download_document(
    case_id: int,
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Faz o download de um documento gerado."""
    # Verifica acesso
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    doc_result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.case_id == case_id)
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@router.get("/{case_id}/list")
async def list_documents(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os documentos gerados para um caso."""
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    docs_result = await db.execute(select(Document).where(Document.case_id == case_id))
    docs = docs_result.scalars().all()

    doc_type_labels = {
        "parecer": "Parecer Técnico",
        "procuracao": "Procuração Ad Judicia",
        "peticao": "Petição Inicial"
    }

    return [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "doc_type_label": doc_type_labels.get(d.doc_type, d.doc_type),
            "filename": d.filename,
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in docs
    ]
