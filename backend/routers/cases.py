from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
import os
import json as json_module

from database import get_db
from models import Case, Contract, Document, ChatMessage
from routers.auth import get_current_user
from models import User
from services.pdf_service import extract_text_from_pdf, extract_pages_as_images, needs_vision, get_pdf_info
from services.ai_service import analyze_contract
from services.plan_service import check_and_consume, accrue_cost

router = APIRouter()

UPLOAD_DIR = "uploads"
DOCS_DIR = "documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DOCS_DIR, exist_ok=True)


def _write_bytes_to_file(path: str, data: bytes) -> None:
    with open(path, "wb") as f:
        f.write(data)


class CaseCreate(BaseModel):
    case_type: str
    client_name: Optional[str] = None
    client_cpf: Optional[str] = None
    client_address: Optional[str] = None


class CaseUpdate(BaseModel):
    client_name: Optional[str] = None
    client_cpf: Optional[str] = None
    client_address: Optional[str] = None
    client_rg: Optional[str] = None
    client_nationality: Optional[str] = None
    client_marital: Optional[str] = None
    client_profession: Optional[str] = None
    status: Optional[str] = None


@router.get("/")
async def list_cases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Case).where(Case.user_id == current_user.id).order_by(desc(Case.created_at))
    )
    cases = result.scalars().all()
    return [
        {
            "id": c.id,
            "client_name": c.client_name or "Cliente não identificado",
            "case_type": c.case_type,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in cases
    ]


@router.post("/")
async def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # ── Verifica cota do plano (HTTP 402 se limite atingido) ──
    await check_and_consume(current_user, db)

    case = Case(
        user_id=current_user.id,
        case_type=case_data.case_type,
        client_name=case_data.client_name,
        client_cpf=case_data.client_cpf,
        client_address=case_data.client_address,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return {"id": case.id, "message": "Caso criado com sucesso"}


@router.get("/{case_id}")
async def get_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Contratos
    contracts_result = await db.execute(select(Contract).where(Contract.case_id == case_id))
    contracts = contracts_result.scalars().all()

    # Documentos
    docs_result = await db.execute(select(Document).where(Document.case_id == case_id))
    docs = docs_result.scalars().all()

    return {
        "id": case.id,
        "client_name": case.client_name,
        "client_cpf": case.client_cpf,
        "client_address": case.client_address,
        "case_type": case.case_type,
        "status": case.status,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "contracts": [
            {
                "id": c.id,
                "filename": c.filename,
                "bank_name": c.bank_name,
                "has_analysis": bool(c.analysis)
            }
            for c in contracts
        ],
        "documents": [
            {
                "id": d.id,
                "doc_type": d.doc_type,
                "filename": d.filename,
                "created_at": d.created_at.isoformat() if d.created_at else None
            }
            for d in docs
        ]
    }


@router.patch("/{case_id}")
async def update_case(
    case_id: int,
    case_data: CaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    update_data = case_data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    await db.commit()
    return {"message": "Caso atualizado"}


@router.post("/{case_id}/upload-contract")
async def upload_contract(
    case_id: int,
    file: UploadFile = File(...),
    bank_name: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Verifica se o caso existe e pertence ao usuário
        result = await db.execute(
            select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
        )
        case = result.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=404, detail="Caso não encontrado")

        # Regra obrigatória: definir tipo do caso antes de analisar o PDF.
        if case.case_type == "pendente":
            raise HTTPException(
                status_code=400,
                detail=(
                    "Antes de enviar o PDF, confirme o tipo do caso no chat: "
                    "1 para CLT (desconto em folha), 2 para Bancário Direto ou 3 para Área da Saúde. "
                    "A análise depende desse contexto."
                )
            )

        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

        # Lê o arquivo
        file_bytes = await file.read()

        # Informações básicas do PDF
        pdf_info = await run_in_threadpool(get_pdf_info, file_bytes)
        total_pages = pdf_info.get("pages", 0)
        print(f"📄 PDF recebido: {file.filename} — {total_pages} página(s)")

        # Extrai texto de TODAS as páginas
        extracted_text = await run_in_threadpool(extract_text_from_pdf, file_bytes)
        print(f"📝 Texto extraído: {len(extracted_text)} caracteres")

        # Se texto insuficiente (PDF escaneado), usa visão
        image_pages = []
        if needs_vision(extracted_text):
            print(f"🖼️  Texto insuficiente — usando visão para {total_pages} página(s)")
            image_pages = await run_in_threadpool(extract_pages_as_images, file_bytes, 8, 90)
            print(f"🖼️  {len(image_pages)} imagem(ns) extraída(s)")

        # Analisa o contrato com IA (texto + imagens se necessário)
        analysis, contract_cost = await analyze_contract(extracted_text, bank_name, image_pages=image_pages)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falha ao analisar contrato: {str(e)}")

    # Salva o arquivo
    filename = f"case_{case_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    await run_in_threadpool(_write_bytes_to_file, file_path, file_bytes)

    # Salva no banco
    contract = Contract(
        case_id=case_id,
        filename=file.filename,
        bank_name=analysis.get("banco_identificado") or bank_name,
        extracted_text=extracted_text,
        analysis=json_module.dumps(analysis, ensure_ascii=False)
    )
    db.add(contract)

    # Auto-preenche dados do cliente a partir do contrato (se ainda não preenchidos)
    dados_cliente = analysis.get("dados_cliente", {})
    if dados_cliente:
        if not case.client_name and dados_cliente.get("nome"):
            case.client_name = dados_cliente["nome"]
        if not case.client_cpf and dados_cliente.get("cpf"):
            case.client_cpf = dados_cliente["cpf"]
        if not case.client_address and dados_cliente.get("endereco"):
            case.client_address = dados_cliente["endereco"]
        # Campos extras salvos como JSON no campo client_address se necessário
        extras = {k: v for k, v in dados_cliente.items()
                  if k not in ("nome", "cpf", "endereco") and v}
        if extras and not case.client_address:
            case.client_address = json_module.dumps(extras, ensure_ascii=False)

    await db.commit()
    await db.refresh(contract)

    # ── Persiste as mensagens do chat para que apareçam ao voltar ao caso ──
    # Mensagem do usuário (upload)
    user_chat_msg = ChatMessage(
        case_id=case_id,
        role="user",
        content=f"📎 Contrato enviado: **{file.filename}**"
    )
    db.add(user_chat_msg)

    # Monta mensagem de análise formatada
    irregularidades = analysis.get("irregularidades", [])
    altas = [i for i in irregularidades if i.get("gravidade") == "alta"]
    needs_case_context = case.case_type == "pendente"

    analysis_msg = f"✅ **Contrato analisado com sucesso!**\n\n"
    if needs_case_context:
        analysis_msg += (
            "ℹ️ Esta é uma **pré-análise técnica** do contrato. "
            "Antes da conclusão final, preciso confirmar o tipo de empréstimo e o objetivo da análise.\n\n"
        )
    analysis_msg += f"**🏦 Banco:** {analysis.get('banco_identificado') or 'Identificação pendente'}\n"
    if analysis.get("numero_contrato"):
        analysis_msg += f"**📄 Contrato:** {analysis['numero_contrato']}\n"
    if analysis.get("valor_emprestimo"):
        analysis_msg += f"**💰 Valor liberado:** {analysis['valor_emprestimo']}\n"
    if analysis.get("taxa_mensal"):
        analysis_msg += f"**📈 Taxa mensal:** {analysis['taxa_mensal']}\n"
    if analysis.get("cet_anual") or analysis.get("taxa_anual"):
        analysis_msg += f"**📊 CET anual:** {analysis.get('cet_anual') or analysis.get('taxa_anual')}\n"
    if analysis.get("numero_parcelas") and analysis.get("valor_parcela"):
        analysis_msg += f"**📅 Parcelas:** {analysis['numero_parcelas']}x de {analysis['valor_parcela']}\n"
    if analysis.get("valor_total_devido"):
        analysis_msg += f"**💸 Total devido:** {analysis['valor_total_devido']}\n"
    analysis_msg += "\n"

    if dados_cliente.get("nome"):
        analysis_msg += f"**👤 Cliente identificado:** {dados_cliente['nome']}"
        if dados_cliente.get("cpf"):
            analysis_msg += f" — CPF: {dados_cliente['cpf']}"
        analysis_msg += "\n\n"

    if irregularidades:
        analysis_msg += f"⚠️ **{len(irregularidades)} irregularidade(s) encontrada(s)**"
        if altas:
            analysis_msg += f" — {len(altas)} de gravidade ALTA 🔴"
        analysis_msg += "\n\n"
        for irr in irregularidades:
            emoji = "🔴" if irr.get("gravidade") == "alta" else ("🟡" if "edia" in (irr.get("gravidade") or "") else "🟢")
            analysis_msg += f"{emoji} **{irr.get('tipo', '')}**\n"
            if irr.get("descricao"):
                analysis_msg += f"{irr['descricao']}\n"
            if irr.get("valor_cobrado") and irr["valor_cobrado"] not in ("N/A", "Não aplicável"):
                analysis_msg += f"💰 Valor: {irr['valor_cobrado']}\n"
            if irr.get("fundamento_legal"):
                analysis_msg += f"📖 *{irr['fundamento_legal']}*\n"
            analysis_msg += "\n"
    else:
        analysis_msg += "✅ Nenhuma irregularidade identificada automaticamente. Recomendo revisão manual.\n\n"

    resumo = analysis.get("resumo_para_cliente", "")
    if resumo and isinstance(resumo, str) and not resumo.strip().startswith("{") and len(resumo) < 1000:
        analysis_msg += f"---\n📋 **Resumo:** {resumo}\n"

    ai_chat_msg = ChatMessage(
        case_id=case_id,
        role="assistant",
        content=analysis_msg
    )
    db.add(ai_chat_msg)

    # Orientação pós-análise
    nome_cliente = dados_cliente.get("nome", "")
    tem_dados = bool(nome_cliente and dados_cliente.get("cpf"))
    if needs_case_context:
        orientacao = (
            "Antes de fechar a conclusão, confirme por favor:\n\n"
            "1. **Tipo do empréstimo**:\n"
            "   - CLT (desconto em folha), ou\n"
            "   - Bancário Direto (crédito pessoal)\n\n"
            "2. **Objetivo**:\n"
            "   - parecer técnico,\n"
            "   - revisão para negociação, ou\n"
            "   - petição inicial.\n\n"
            "Com essa confirmação, eu ajusto os parâmetros corretos e te entrego a análise final."
        )
    elif tem_dados:
        orientacao = (
            f"Os dados de **{nome_cliente}** foram extraídos automaticamente do contrato. ✅\n\n"
            "Podemos avançar para a geração dos documentos. Deseja que eu gere agora:\n\n"
            "1. **Parecer Técnico** — análise formal das irregularidades\n"
            "2. **Procuração Ad Judicia** — para o cliente assinar\n"
            "3. **Petição Inicial** — para protocolar no processo\n\n"
            "Pode usar os botões abaixo ou me dizer por qual documento quer começar."
        )
    else:
        orientacao = (
            "O contrato foi processado. Para gerar os documentos, confirme os dados do cliente:\n\n"
            "- Nome completo\n- CPF\n- Endereço completo\n\n"
            "Ou use os botões abaixo para gerar os documentos com os dados disponíveis."
        )

    orientacao_msg = ChatMessage(case_id=case_id, role="assistant", content=orientacao)
    db.add(orientacao_msg)

    # Acumula custo real de API no caso e no usuário
    await accrue_cost(case, current_user, contract_cost, db)

    await db.commit()
    # ── fim persistência de mensagens ──

    return {
        "contract_id": contract.id,
        "bank_identified": analysis.get("banco_identificado"),
        "irregularidades_count": len(analysis.get("irregularidades", [])),
        "dados_cliente_extraidos": bool(dados_cliente),
        "analysis": analysis
    }


@router.delete("/{case_id}")
async def delete_case(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Case).where(Case.id == case_id, Case.user_id == current_user.id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    # Remove mensagens, contratos e documentos vinculados
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(ChatMessage).where(ChatMessage.case_id == case_id))
    await db.execute(sql_delete(Contract).where(Contract.case_id == case_id))
    await db.execute(sql_delete(Document).where(Document.case_id == case_id))
    await db.delete(case)
    await db.commit()

    return {"message": "Caso excluído com sucesso"}