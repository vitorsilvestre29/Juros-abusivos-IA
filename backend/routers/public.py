from fastapi import APIRouter
from models import LOAN_TYPES
import os

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/loan-types")
async def list_loan_types():
    """Retorna os tipos de emprestimo disponiveis para analise."""
    return [{"id": k, "label": v} for k, v in LOAN_TYPES.items()]


@router.get("/pricing")
async def pricing():
    """Retorna o preco do laudo."""
    price = float(os.getenv("REPORT_PRICE", "20.00"))
    return {
        "price_brl": price,
        "description": "Laudo Tecnico Completo de Analise de Abusividades",
        "includes": [
            "Analise completa de todas as clausulas do contrato",
            "Comparacao com taxas medias do Banco Central",
            "Identificacao de irregularidades com fundamento legal",
            "Calculo do impacto financeiro",
            "Laudo em PDF pronto para advogado",
            "Indicacao de acao revisional quando aplicavel",
        ],
    }
