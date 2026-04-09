"""
Pipeline completo de análise de contrato:
1. Extrai texto do PDF/imagem
2. Busca taxa de referência do BCB
3. Envia ao Claude para análise
4. Calcula impacto financeiro
5. Salva resultado no banco
"""
from __future__ import annotations

import json
from datetime import datetime

from services.pdf_service import extract_text_from_pdf, extract_pages_as_images, needs_vision
from services.bcb_service import get_bcb_rate
from services.ai_service import analyze_contract
from services.impact_service import calculate_financial_impact
from models import AnalysisStatus


async def run_full_analysis(
    contract_id: int,
    analysis_id: int,
    file_bytes: bytes,
    file_type: str,
    loan_type: str,
    user_email: str,
) -> None:
    """
    Executado em background após o upload do contrato.
    Atualiza o registro Analysis no banco com o resultado.
    """
    from database import AsyncSessionLocal
    from models import Analysis
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # Marca como processando
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis:
            return

        analysis.status = AnalysisStatus.PROCESSING
        await db.commit()

        try:
            # ── 1. Extração de texto ──────────────────────────────────
            extracted_text = ""
            image_pages: list[str] = []

            if file_type == "pdf":
                extracted_text = extract_text_from_pdf(file_bytes)
                if needs_vision(extracted_text):
                    image_pages = extract_pages_as_images(file_bytes, max_pages=20, dpi=100)
            else:
                # Imagem: converte para base64 e envia direto ao Claude Vision
                import base64
                image_pages = [base64.standard_b64encode(file_bytes).decode("utf-8")]

            # ── 2. Taxa de referência BCB ─────────────────────────────
            bcb_data = await get_bcb_rate(loan_type)
            reference_rate = bcb_data["monthly_rate_pct"]

            # ── 3. Análise com Claude ─────────────────────────────────
            ai_result, _cost = await analyze_contract(
                contract_text=extracted_text,
                bank_name="",
                image_pages=image_pages if image_pages else None,
            )

            # ── 4. Cálculo de impacto ─────────────────────────────────
            impact_data = calculate_financial_impact(ai_result, reference_rate)

            # ── 5. Salva resultado ────────────────────────────────────
            irregularities = ai_result.get("irregularidades", [])
            has_issues = len(irregularities) > 0

            analysis.status = AnalysisStatus.COMPLETED
            analysis.ai_result_json = json.dumps(ai_result, ensure_ascii=False)
            analysis.has_issues = has_issues
            analysis.irregularities_count = len(irregularities)
            analysis.impact_brl = impact_data.get("estimated_overcharge_brl", 0.0)
            analysis.bcb_rate_pct = reference_rate
            analysis.completed_at = datetime.utcnow()

            await db.commit()

        except Exception as e:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = str(e)[:500]
            await db.commit()
            print(f"[analysis_service] Erro na análise {analysis_id}: {e}")
