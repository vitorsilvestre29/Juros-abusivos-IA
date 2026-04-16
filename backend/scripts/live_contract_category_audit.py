from __future__ import annotations

import asyncio
import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import LOAN_TYPES
from services import analysis_service, bcb_service


CONTRACT_DATE = "08/02/2023"
EXPECTED_SERIES = {
    "consignado_inss": "25468",
    "consignado_clt": "25466",
    "credito_pessoal": "25464",
    "credito_habitacional": "25497",
    "cdc_veiculo": "25480",
    "cartao_credito": "20739",
}

CONTRACT_FIXTURES = {
    "consignado_inss": (
        "Contrato de emprestimo consignado INSS. Beneficio previdenciario, aposentado, "
        "numero do beneficio NB 123456789. Emissao 08/02/2023. Valor liberado R$ 10.000,00. "
        "Taxa mensal 2,90% a.m. Prazo 36 parcelas."
    ),
    "consignado_clt": (
        "Contrato de emprestimo consignado privado. Desconto em folha de pagamento, holerite, "
        "empregador conveniado. Emissao 08/02/2023. Valor liberado R$ 10.000,00. "
        "Taxa mensal 4,39% a.m. Prazo 36 parcelas."
    ),
    "credito_pessoal": (
        "Contrato de credito pessoal nao consignado. Emprestimo pessoal sem desconto em folha. "
        "Emissao 08/02/2023. Valor liberado R$ 10.000,00. Taxa mensal 8,50% a.m. "
        "Prazo 24 parcelas."
    ),
    "credito_habitacional": (
        "Contrato de financiamento imobiliario. Alienacao fiduciaria de imovel residencial no SFH. "
        "Emissao 08/02/2023. Valor financiado R$ 180.000,00. Taxa mensal 0,90% a.m. "
        "Prazo 240 parcelas."
    ),
    "cdc_veiculo": (
        "Contrato de financiamento de veiculo CDC. Automovel com chassi 9BWZZZ377VT004251, "
        "RENAVAM 123456789 e alienacao fiduciaria do veiculo. Emissao 08/02/2023. "
        "Valor financiado R$ 45.000,00. Taxa mensal 3,20% a.m. Prazo 48 parcelas."
    ),
    "cartao_credito": (
        "Contrato de cartao de credito. Limite de credito, fatura do cartao, pagamento minimo "
        "e credito rotativo. Emissao 08/02/2023. Limite de credito R$ 5.000,00. "
        "Saldo financiado no rotativo R$ 3.200,00. Taxa mensal 15,00% a.m."
    ),
}


def _parse_bcb_date(value: str) -> datetime:
    return datetime.strptime(value, "%d/%m/%Y")


def _log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _assert_ai_context_would_be_correct(loan_type: str, bcb_context: str, loan_rate: dict[str, Any]) -> None:
    required_fragments = [
        f"MODALIDADE ANALISADA: {loan_type.upper()}",
        f"Serie SGS: {EXPECTED_SERIES[loan_type]}",
        f"Data solicitada para comparacao: {CONTRACT_DATE}",
        f"Data de referencia BCB: {loan_rate['bcb_reference_date']}",
        str(loan_rate["source_url"]),
        "Use EXCLUSIVAMENTE os valores acima",
    ]
    missing = [fragment for fragment in required_fragments if fragment not in bcb_context]
    if missing:
        raise AssertionError(f"Contexto da IA incompleto para {loan_type}: {missing}")


async def _build_public_bcb_context(loan_type: str, reference_date: str, selic: dict[str, Any], cdi: dict[str, Any]) -> dict[str, Any]:
    loan_rate = await bcb_service.get_bcb_rate(
        loan_type,
        force_refresh=True,
        reference_date=reference_date,
    )
    inss_cap = None
    if loan_type in ("consignado", "consignado_inss"):
        inss_cap = await bcb_service.get_consignado_inss_cap(
            force_refresh=True,
            reference_date=reference_date,
        )
    return {
        "loan_rate": loan_rate,
        "selic": selic,
        "cdi": cdi,
        "inss_cap": inss_cap,
        "fetched_at": datetime.now(UTC).isoformat(),
    }


async def _run_live_ai_check(loan_type: str, contract_text: str, reference_rate: float, bcb_prompt: str) -> dict[str, Any]:
    ai_result, usage, model_name = await analysis_service.analyze_contract(
        contract_text=contract_text,
        loan_type=loan_type,
        reference_rate=reference_rate,
        bcb_context=bcb_prompt,
    )
    normalized_ref = float(ai_result["taxa_referencia_bcb"])
    if round(normalized_ref, 4) != round(float(reference_rate), 4):
        raise AssertionError(
            f"{loan_type}: IA retornou taxa_referencia_bcb={normalized_ref}, esperado {reference_rate}"
        )
    if ai_result["tipo_contrato"] != loan_type:
        raise AssertionError(
            f"{loan_type}: IA retornou tipo_contrato={ai_result['tipo_contrato']}, esperado {loan_type}"
        )
    return {
        "model": model_name,
        "input_tokens": int((usage or {}).get("input_tokens", 0) or 0),
        "output_tokens": int((usage or {}).get("output_tokens", 0) or 0),
        "taxa_referencia_bcb": normalized_ref,
        "irregularidades_count": len(ai_result.get("irregularidades", [])),
        "resumo_preview": str(ai_result.get("resumo_tecnico", ""))[:180],
    }


async def audit_success_paths(live_ai: bool) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    _log("[audit] Buscando Selic/CDI oficiais uma vez para compor o contexto da IA...")
    selic, cdi = await asyncio.gather(
        bcb_service.get_selic_rate(force_refresh=True),
        bcb_service.get_cdi_rate(force_refresh=True),
    )

    for loan_type in LOAN_TYPES:
        _log(f"[audit] Validando categoria {loan_type}...")
        text = CONTRACT_FIXTURES[loan_type]
        extracted_date = analysis_service._extract_contract_reference_date(text)
        if extracted_date != CONTRACT_DATE:
            raise AssertionError(f"{loan_type}: data extraida {extracted_date}, esperado {CONTRACT_DATE}")

        analysis_service._assert_contract_type_consistency(loan_type, text)

        ctx = await _build_public_bcb_context(loan_type, extracted_date, selic, cdi)
        loan_rate = ctx["loan_rate"]
        bcb_prompt = bcb_service.format_bcb_context_for_prompt(ctx)
        _assert_ai_context_would_be_correct(loan_type, bcb_prompt, loan_rate)

        expected_serie = EXPECTED_SERIES[loan_type]
        if loan_rate["bcb_serie"] != expected_serie:
            raise AssertionError(
                f"{loan_type}: serie {loan_rate['bcb_serie']}, esperado {expected_serie}"
            )
        if loan_rate["requested_reference_date"] != CONTRACT_DATE:
            raise AssertionError(
                f"{loan_type}: data solicitada {loan_rate['requested_reference_date']}, esperado {CONTRACT_DATE}"
            )
        if _parse_bcb_date(loan_rate["bcb_reference_date"]) > _parse_bcb_date(CONTRACT_DATE):
            raise AssertionError(
                f"{loan_type}: BCB retornou data posterior ao contrato: {loan_rate['bcb_reference_date']}"
            )
        if float(loan_rate["monthly_rate_pct"]) <= 0:
            raise AssertionError(f"{loan_type}: taxa BCB invalida: {loan_rate['monthly_rate_pct']}")
        if not str(loan_rate["source_url"]).startswith("https://api.bcb.gov.br/"):
            raise AssertionError(f"{loan_type}: fonte nao e API SGS publica: {loan_rate['source_url']}")

        ai_check = None
        if live_ai:
            _log(f"[audit] Chamando IA real para {loan_type}...")
            ai_check = await _run_live_ai_check(
                loan_type=loan_type,
                contract_text=text,
                reference_rate=float(loan_rate["monthly_rate_pct"]),
                bcb_prompt=bcb_prompt,
            )

        rows.append(
            {
                "loan_type": loan_type,
                "label": LOAN_TYPES[loan_type],
                "contract_date": extracted_date,
                "bcb_serie": loan_rate["bcb_serie"],
                "bcb_reference_date": loan_rate["bcb_reference_date"],
                "monthly_rate_pct": loan_rate["monthly_rate_pct"],
                "annual_rate_pct": loan_rate["annual_rate_pct"],
                "source_url": loan_rate["source_url"],
                "ai_context_checked": True,
                "live_ai_checked": bool(live_ai),
                "live_ai": ai_check,
            }
        )
    return rows


def audit_blocked_errors() -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []

    mismatch_cases = [
        ("consignado_inss", "consignado_clt"),
        ("consignado_clt", "consignado_inss"),
        ("cdc_veiculo", "credito_habitacional"),
        ("credito_habitacional", "cdc_veiculo"),
        ("credito_pessoal", "cartao_credito"),
    ]
    for selected, actual in mismatch_cases:
        try:
            analysis_service._assert_contract_type_consistency(selected, CONTRACT_FIXTURES[actual])
        except analysis_service.ContractTypeMismatchError as exc:
            checks.append(
                {
                    "case": f"modalidade_errada:{selected}_vs_{actual}",
                    "blocked": True,
                    "detected": exc.detected_loan_type,
                }
            )
        else:
            raise AssertionError(f"Modalidade errada nao bloqueada: {selected} vs {actual}")

    try:
        analysis_service._extract_contract_reference_date("Contrato sem qualquer data de contratacao.")
    except RuntimeError as exc:
        checks.append({"case": "data_contrato_ausente", "blocked": True, "message": str(exc)})
    else:
        raise AssertionError("Contrato sem data nao foi bloqueado")

    return checks


async def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

    parser = argparse.ArgumentParser()
    parser.add_argument("--live-ai", action="store_true", help="Chama a IA real alem da API publica do BCB.")
    args = parser.parse_args()

    success_rows = await audit_success_paths(live_ai=args.live_ai)
    blocked_rows = audit_blocked_errors()
    payload = {
        "audit": "live_contract_category_audit",
        "official_public_api": "BCB SGS",
        "live_ai_enabled": args.live_ai,
        "contract_date_used_in_simulation": CONTRACT_DATE,
        "success_count": len(success_rows),
        "blocked_error_count": len(blocked_rows),
        "success_rows": success_rows,
        "blocked_error_rows": blocked_rows,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
