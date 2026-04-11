"""
Pipeline completo de analise de contrato:
1. Extrai texto do PDF/imagem
2. Busca taxa de referencia do BCB
3. Envia ao Claude para analise
4. Calcula impacto financeiro
5. Salva resultado no banco
"""
from __future__ import annotations

import json
import os
import base64
import io
from datetime import datetime
from typing import Optional

from services.bcb_service import get_bcb_rate, get_enriched_bcb_context, format_bcb_context_for_prompt
from services.stj_service import get_stj_context, format_stj_context_for_prompt
from models import AnalysisStatus

MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"


# ── Extracao de texto ─────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import pdfplumber
        parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        print(f"[pdf] pdfplumber error: {e}")
        return ""


def needs_vision(text: str) -> bool:
    return len(text.strip()) < 200


def ocr_pdf(file_bytes: bytes) -> str:
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(file_bytes, dpi=150, first_page=1, last_page=10)
        texts = [pytesseract.image_to_string(img, lang="por") for img in images]
        return "\n".join(t for t in texts if t)
    except Exception as e:
        print(f"[pdf] OCR error: {e}")
        return ""


def extract_pages_as_images(file_bytes: bytes, max_pages: int = 10, dpi: int = 100) -> list:
    try:
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(file_bytes, dpi=dpi, first_page=1, last_page=max_pages)
        result = []
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            result.append(base64.standard_b64encode(buf.getvalue()).decode("utf-8"))
        return result
    except Exception as e:
        print(f"[pdf] pdf2image error: {e}")
        return []


# ── Analise com Claude ────────────────────────────────────────────────────────

def _load_skills_context() -> str:
    skills_dir = os.path.join(os.path.dirname(__file__), "..", "skills")
    parts = []
    for fname in ["resolucoes-bcb-vigentes.md", "tabelas-juros-abusivos.md", "jurisprudencia-stj.md"]:
        fpath = os.path.join(skills_dir, fname)
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    parts.append(f.read()[:1500])
            except Exception:
                pass
    return "\n\n".join(parts)


def _mock_result(loan_type: str, reference_rate: float) -> dict:
    return {
        "tipo_contrato": loan_type,
        "banco_credor": "Banco Exemplo S.A.",
        "valor_contratado": 25000.00,
        "taxa_mensal_contratada": 4.5,
        "taxa_anual_contratada": 68.0,
        "taxa_referencia_bcb": reference_rate,
        "prazo_meses": 48,
        "irregularidades": [
            {
                "tipo": "Taxa acima da media BCB",
                "descricao": f"Taxa mensal de 4,5% supera a media BCB ({reference_rate:.2f}%) para este tipo de credito.",
                "gravidade": "alta",
                "valor_estimado": 8500.00,
            },
            {
                "tipo": "Capitalizacao indevida de juros",
                "descricao": "Juros sobre juros (anatocismo) vedado pelo STJ - Sumula 121.",
                "gravidade": "alta",
                "valor_estimado": 3200.00,
            },
            {
                "tipo": "Tarifa de cadastro abusiva",
                "descricao": "Tarifa nao prevista na Resolucao BCB 4.881/2021.",
                "gravidade": "media",
                "valor_estimado": 450.00,
            },
        ],
        "resumo_tecnico": "Contrato apresenta 3 irregularidades tecnicas com potencial de revisao judicial.",
        "recomendacao": "Recomenda-se analise por advogado especializado para eventual acao revisional.",
    }


async def analyze_contract(
    contract_text: str,
    loan_type: str,
    reference_rate: float,
    image_pages: Optional[list] = None,
    bcb_context: str = "",
    stj_context: str = "",
) -> dict:
    if MOCK_MODE:
        return _mock_result(loan_type, reference_rate)

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    skills_ctx = _load_skills_context()

    system_prompt = f"""Voce e um analista financeiro especializado em direito bancario brasileiro.
Analise contratos de emprestimo/financiamento identificando irregularidades TECNICAS e MATEMATICAS.
Nao preste assessoria juridica — apenas analise tecnica.

{bcb_context if bcb_context else ""}

{stj_context if stj_context else ""}

CONTEXTO NORMATIVO ADICIONAL:
{skills_ctx}

INSTRUCOES:
- Compare a taxa contratada com a taxa media BCB fornecida acima
- Identifique clausulas que violem as sumulas e normas listadas
- Calcule o excesso cobrado com base na diferenca entre a taxa contratada e a taxa BCB
- Verifique tarifas cobradas contra a lista permitida pela Resolucao CMN 4.881/2021
- Verifique se o CET foi informado conforme Resolucao CMN 3.517/2007
- Para consignado: verifique se o desconto respeita o limite de 35% do beneficio

Responda SOMENTE em JSON valido com esta estrutura:
{{
  "tipo_contrato": "string",
  "banco_credor": "string",
  "valor_contratado": 0.00,
  "taxa_mensal_contratada": 0.00,
  "taxa_anual_contratada": 0.00,
  "taxa_referencia_bcb": {reference_rate},
  "prazo_meses": 0,
  "irregularidades": [
    {{
      "tipo": "string",
      "descricao": "string",
      "gravidade": "alta|media|baixa",
      "valor_estimado": 0.00
    }}
  ],
  "resumo_tecnico": "string",
  "recomendacao": "string"
}}"""

    if image_pages:
        content = []
        if contract_text:
            content.append({"type": "text", "text": f"Texto extraido:\n{contract_text[:3000]}"})
        for img_b64 in image_pages[:5]:
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64},
            })
        content.append({"type": "text", "text": f"Analise este contrato de {loan_type}."})
        messages = [{"role": "user", "content": content}]
    else:
        messages = [{
            "role": "user",
            "content": f"Analise este contrato de {loan_type}:\n\n{contract_text[:8000]}",
        }]

    resp = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system_prompt,
        messages=messages,
    )

    raw = resp.content[0].text.strip()
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    return json.loads(raw)


# ── Calculo de impacto ────────────────────────────────────────────────────────

def calculate_financial_impact(ai_result: dict, reference_rate: float) -> dict:
    irregularidades = ai_result.get("irregularidades", [])
    total = sum(i.get("valor_estimado", 0.0) for i in irregularidades)

    taxa = ai_result.get("taxa_mensal_contratada", 0.0)
    valor = ai_result.get("valor_contratado", 0.0)
    prazo = ai_result.get("prazo_meses", 0)

    if total == 0 and taxa > reference_rate and valor > 0 and prazo > 0:
        total = valor * ((taxa - reference_rate) / 100) * prazo

    return {
        "estimated_overcharge_brl": round(total, 2),
        "taxa_contratada": taxa,
        "taxa_referencia": reference_rate,
        "irregularidades_count": len(irregularidades),
    }


# ── Pipeline principal ────────────────────────────────────────────────────────

async def run_full_analysis(
    contract_id: int,
    analysis_id: int,
    file_bytes: bytes,
    file_type: str,
    loan_type: str,
    user_email: str,
    user_phone: str = "",
) -> None:
    from database import AsyncSessionLocal
    from models import Analysis
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis:
            return

        analysis.status = AnalysisStatus.PROCESSING
        await db.commit()

        try:
            # 1. Extracao de texto
            extracted_text = ""
            image_pages: list = []

            if file_type == "pdf":
                extracted_text = extract_text_from_pdf(file_bytes)
                if needs_vision(extracted_text):
                    ocr_text = ocr_pdf(file_bytes)
                    if len(ocr_text.strip()) > 200:
                        extracted_text = ocr_text
                    else:
                        image_pages = extract_pages_as_images(file_bytes, max_pages=10, dpi=100)
            else:
                image_pages = [base64.standard_b64encode(file_bytes).decode("utf-8")]

            # 2. Taxa BCB + Selic + STJ em paralelo
            bcb_ctx_data, stj_ctx_data = await asyncio.gather(
                get_enriched_bcb_context(loan_type),
                get_stj_context(loan_type),
                return_exceptions=True,
            )
            if isinstance(bcb_ctx_data, Exception):
                bcb_ctx_data = {}
            if isinstance(stj_ctx_data, Exception):
                stj_ctx_data = {}

            bcb_loan = bcb_ctx_data.get("loan_rate", {})
            reference_rate = bcb_loan.get("monthly_rate_pct", 0.0)
            if reference_rate == 0.0:
                fallback = await get_bcb_rate(loan_type)
                reference_rate = fallback.get("monthly_rate_pct", 4.0)

            bcb_prompt_ctx = format_bcb_context_for_prompt(bcb_ctx_data)
            stj_prompt_ctx = format_stj_context_for_prompt(stj_ctx_data)

            print(f"[analysis] BCB rate fetched: {reference_rate}% a.m. | STJ cases: {len(stj_ctx_data.get('leading_cases', []))}")

            # 3. Analise Claude com contexto enriquecido
            ai_result = await analyze_contract(
                contract_text=extracted_text,
                loan_type=loan_type,
                reference_rate=reference_rate,
                image_pages=image_pages if image_pages else None,
                bcb_context=bcb_prompt_ctx,
                stj_context=stj_prompt_ctx,
            )

            # 4. Impacto financeiro
            impact_data = calculate_financial_impact(ai_result, reference_rate)

            # 5. Salva
            irregularities = ai_result.get("irregularidades", [])
            analysis.status = AnalysisStatus.COMPLETED
            analysis.ai_result_json = json.dumps(ai_result, ensure_ascii=False)
            # Notificar WhatsApp se numero disponivel
            if user_phone:
                try:
                    asyncio.ensure_future(send_whatsapp_notification(
                        user_phone, len(ai_result.get("irregularidades", [])) > 0, contract_id
                    ))
                except Exception:
                    pass
            analysis.has_issues = len(irregularities) > 0
            analysis.irregularities_count = len(irregularities)
            analysis.impact_brl = impact_data.get("estimated_overcharge_brl", 0.0)
            analysis.bcb_rate_pct = reference_rate
            analysis.completed_at = datetime.utcnow()
            await db.commit()

        except Exception as e:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)[:500]
            await db.commit()
            print(f"[analysis_service] Erro na analise {analysis_id}: {e}")

# ── Notificacao WhatsApp via Z-API ────────────────────────────────────────────
import asyncio
import httpx

async def send_whatsapp_notification(phone: str, has_issues: bool, contract_id: int) -> None:
    instance_id  = os.getenv("ZAPI_INSTANCE_ID", "")
    token        = os.getenv("ZAPI_TOKEN", "")
    client_token = os.getenv("ZAPI_CLIENT_TOKEN", "")
    if not instance_id or not token:
        return

    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 11:
        digits = "55" + digits
    elif len(digits) == 10:
        digits = "55" + digits

    site = os.getenv("FRONTEND_URL", "https://juros-abusivos.vercel.app")
    if has_issues:
        msg = (
            "Ola, sua analise de contrato foi concluida.\n\n"
            "*Irregularidades identificadas no seu contrato.*\n\n"
            "Acesse o laudo tecnico por apenas R$ 9,99 para ver os detalhes e agir:\n"
            + site + "/analise/" + str(contract_id)
        )
    else:
        msg = (
            "Ola, sua analise de contrato foi concluida.\n\n"
            "Acesse o laudo tecnico por apenas R$ 9,99 para ver o resultado completo:\n"
            + site + "/analise/" + str(contract_id)
        )

    url = f"https://api.z-api.io/instances/{instance_id}/token/{token}/send-text"
    headers = {"client-token": client_token, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json={"phone": digits, "message": msg}, headers=headers)
            print("[whatsapp] Notificacao enviada: " + digits)
    except Exception as e:
        print("[whatsapp] Erro: " + str(e))
