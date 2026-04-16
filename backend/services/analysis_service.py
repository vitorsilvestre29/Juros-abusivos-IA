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
import re
import unicodedata
from time import perf_counter
from datetime import UTC, datetime
from typing import Any, Optional

from services.bcb_service import get_enriched_bcb_context, format_bcb_context_for_prompt, BCBAPIError
from services.ops_alert_service import send_ops_alert
from models import AnalysisStatus

MODEL_NAME = "claude-sonnet-4-6"

MOCK_REFERENCE_RATES: dict[str, float] = {
    "consignado_inss": 1.80,
    "consignado_clt": 2.10,
    "credito_pessoal": 8.90,
    "credito_habitacional": 1.05,
    "cdc_veiculo": 3.20,
    "cartao_credito": 15.40,
}

LOAN_TYPE_LABELS: dict[str, str] = {
    "consignado_inss": "Consignado INSS",
    "consignado_clt": "Consignado CLT (desconto em folha)",
    "credito_pessoal": "Credito Pessoal (bancario direto)",
    "credito_habitacional": "Credito Habitacional / Financiamento Imobiliario",
    "cdc_veiculo": "CDC Veiculo / Financiamento de Veiculo",
    "cartao_credito": "Cartao de Credito",
}

CONTRACT_TYPE_SIGNALS: dict[str, dict[str, tuple[str, ...]]] = {
    "consignado_inss": {
        "strong": (
            "beneficio previdenciario",
            "aposentadoria",
            "aposentado",
            "pensionista do inss",
            "beneficio do inss",
            "margem consignavel",
        ),
        "medium": (
            "inss",
            "numero do beneficio",
            "nb ",
        ),
    },
    "consignado_clt": {
        "strong": (
            "desconto em folha",
            "folha de pagamento",
            "holerite",
            "averbacao em folha",
            "consignado privado",
        ),
        "medium": (
            "empregador",
            "empresa conveniada",
        ),
    },
    "credito_pessoal": {
        "strong": (
            "credito pessoal nao consignado",
            "emprestimo pessoal nao consignado",
            "sem consignacao em folha",
            "sem desconto em folha",
        ),
        "medium": (
            "credito pessoal",
            "emprestimo pessoal",
        ),
    },
    "credito_habitacional": {
        "strong": (
            "financiamento imobiliario",
            "alienacao fiduciaria de imovel",
            "alienacao fiduciaria do imovel",
            "sistema financeiro da habitacao",
            "sfh",
            "sfi",
        ),
        "medium": (
            "imovel residencial",
            "unidade imobiliaria",
        ),
    },
    "cdc_veiculo": {
        "strong": (
            "renavam",
            "chassi",
            "alienacao fiduciaria do veiculo",
            "financiamento de veiculo",
            "automovel",
        ),
        "medium": (
            "veiculo",
            "placa",
        ),
    },
    "cartao_credito": {
        "strong": (
            "cartao de credito",
            "pagamento minimo",
            "credito rotativo",
            "limite de credito",
            "fatura do cartao",
        ),
        "medium": (
            "anuidade",
            "rotativo",
            "fatura",
        ),
    },
}


class ContractTypeMismatchError(RuntimeError):
    def __init__(self, selected_loan_type: str, detected_loan_type: str, evidence: list[str]):
        self.selected_loan_type = selected_loan_type
        self.detected_loan_type = detected_loan_type
        self.evidence = evidence
        selected_label = LOAN_TYPE_LABELS.get(selected_loan_type, selected_loan_type)
        detected_label = LOAN_TYPE_LABELS.get(detected_loan_type, detected_loan_type)
        evidence_text = ", ".join(evidence[:3])
        super().__init__(
            "O tipo de contrato selecionado nao confere com o documento enviado. "
            f"Voce marcou '{selected_label}', mas o contrato indica '{detected_label}'. "
            f"Sinais encontrados no texto: {evidence_text}. "
            "Corrija a modalidade e envie novamente. Nessa situacao, o pagamento nao e liberado."
        )


def _is_mock_ai_mode() -> bool:
    return os.getenv("MOCK_AI_MODE", "false").lower() == "true"


def _max_output_tokens() -> int:
    """
    Controle via ambiente para ajuste gradual de custo x qualidade.
    Default: 4096 para permitir laudos completos em contratos longos.
    """
    raw = os.getenv("AI_MAX_OUTPUT_TOKENS", "4096")
    try:
        value = int(raw)
    except Exception:
        return 2000
    # Evita configuracoes perigosas/acidentais.
    if value < 500:
        return 500
    if value > 4096:
        return 4096
    return value


def _contract_text_char_limit() -> int:
    raw = os.getenv("AI_CONTRACT_TEXT_CHAR_LIMIT", "30000")
    try:
        value = int(raw)
    except Exception:
        return 30000
    if value < 8000:
        return 8000
    if value > 60000:
        return 60000
    return value


def _precheck_max_output_tokens() -> int:
    raw = os.getenv("AI_PRECHECK_MAX_OUTPUT_TOKENS", "120")
    try:
        value = int(raw)
    except Exception:
        return 120
    if value < 40:
        return 40
    if value > 300:
        return 300
    return value


def _input_cost_per_mtok_usd() -> float:
    try:
        return float(os.getenv("AI_INPUT_COST_PER_MTOK_USD", "3.0"))
    except Exception:
        return 3.0


def _output_cost_per_mtok_usd() -> float:
    try:
        return float(os.getenv("AI_OUTPUT_COST_PER_MTOK_USD", "15.0"))
    except Exception:
        return 15.0


def _usd_brl_rate() -> float:
    try:
        return float(os.getenv("AI_USD_BRL_EXCHANGE_RATE", "5.0"))
    except Exception:
        return 5.0


def _estimate_cost(input_tokens: int, output_tokens: int) -> tuple[float, float]:
    input_usd = (max(input_tokens, 0) / 1_000_000.0) * _input_cost_per_mtok_usd()
    output_usd = (max(output_tokens, 0) / 1_000_000.0) * _output_cost_per_mtok_usd()
    usd = round(input_usd + output_usd, 8)
    brl = round(usd * _usd_brl_rate(), 8)
    return usd, brl


def _analysis_max_attempts_per_model() -> int:
    raw = os.getenv("AI_ANALYSIS_MAX_ATTEMPTS_PER_MODEL", "2")
    try:
        value = int(raw)
    except Exception:
        return 2
    if value < 1:
        return 1
    if value > 4:
        return 4
    return value


def _analysis_model_candidates() -> list[str]:
    primary = (os.getenv("AI_MODEL_PRIMARY", MODEL_NAME) or MODEL_NAME).strip()
    fallback = (os.getenv("AI_MODEL_FALLBACK", "") or "").strip()
    extra_raw = (os.getenv("AI_MODEL_FALLBACKS", "") or "").strip()
    extras = [x.strip() for x in extra_raw.split(",") if x.strip()]

    ordered = [primary]
    if fallback:
        ordered.append(fallback)
    ordered.extend(extras)

    unique: list[str] = []
    seen: set[str] = set()
    for model in ordered:
        if model and model not in seen:
            seen.add(model)
            unique.append(model)
    return unique or [MODEL_NAME]


def _normalize_text_for_match(text: str) -> str:
    if not text:
        return ""
    txt = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    txt = txt.lower()
    txt = re.sub(r"\s+", " ", txt)
    return txt


def _normalize_text_for_search(text: str) -> str:
    if not text:
        return ""
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()


def _valid_contract_date_candidates(text: str) -> list[tuple[int, datetime, str, str]]:
    candidates: list[tuple[int, datetime, str, str]] = []
    for match in re.finditer(r"\b(\d{2}/\d{2}/\d{4})\b", text):
        raw_date = match.group(1)
        try:
            parsed = datetime.strptime(raw_date, "%d/%m/%Y")
        except Exception:
            continue

        year = parsed.year
        if year < 2000 or year > datetime.now().year + 1:
            continue

        window_start = max(0, match.start() - 120)
        window_end = min(len(text), match.end() + 120)
        window = text[window_start:window_end]
        before = text[max(0, match.start() - 120):match.start()]
        after = text[match.end():min(len(text), match.end() + 80)]
        score = 0
        if "data de contratacao" in before:
            score += 105
        if "data do contrato" in before:
            score += 100
        if "emissao" in before:
            score += 95
        if "data de liberacao" in before:
            score += 90
        if "celebrad" in before:
            score += 80
        if "ccb" in before and "emissao" in before:
            score += 10

        non_contract_markers = (
            "vencimento",
            "nascimento",
            "impressao",
            "cadastro",
            "registro",
            "parcela",
            "assinatura",
        )
        if any(marker in before or marker in after for marker in non_contract_markers):
            score -= 40
        if score > 0:
            candidates.append((score, parsed, raw_date, "context"))
    return candidates


def _extract_contract_reference_date(contract_text: str) -> str:
    """
    Identifica a data da contratacao diretamente do contrato para usar a taxa
    historica correta do BCB.
    """
    text = _normalize_text_for_search(contract_text)
    if not text.strip():
        raise RuntimeError("Nao foi possivel identificar a data da contratacao no contrato.")

    line_patterns: list[tuple[int, str]] = [
        (105, r"data de contratacao[^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
        (100, r"data do contrato[^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
        (95, r"emissao[^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
        (90, r"data de liberacao[^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
        (85, r"ccb n[ºo]?[^\n\r]{0,120}?emissao[^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
        (80, r"celebrad[oa][^\n\r]{0,40}?(\d{2}/\d{2}/\d{4})"),
    ]
    candidates: list[tuple[int, datetime, str, str]] = []
    for score, pattern in line_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw_date = match.group(1)
            try:
                parsed = datetime.strptime(raw_date, "%d/%m/%Y")
            except Exception:
                continue
            candidates.append((score, parsed, raw_date, "labeled"))

    if not candidates:
        candidates.extend(_valid_contract_date_candidates(text))

    if not candidates:
        raw_dates: list[tuple[datetime, str]] = []
        for match in re.finditer(r"\b(\d{2}/\d{2}/\d{4})\b", text):
            raw_date = match.group(1)
            try:
                parsed = datetime.strptime(raw_date, "%d/%m/%Y")
            except Exception:
                continue
            year = parsed.year
            if year < 2000 or year > datetime.now().year + 1:
                continue
            raw_dates.append((parsed, raw_date))
        raw_months = {(item[0].year, item[0].month) for item in raw_dates}
        if len(raw_months) > 1:
            valid_candidates = _valid_contract_date_candidates(text)
            valid_months = {(item[1].year, item[1].month) for item in valid_candidates}
            if len(valid_months) == 1:
                valid_candidates.sort(key=lambda item: (-item[0], item[1]))
                return valid_candidates[0][2]
            dates = ", ".join(sorted({item[1] for item in raw_dates}))
            raise RuntimeError(
                "Nao foi possivel determinar com seguranca a data da contratacao. "
                f"O documento contem datas em meses/anos diferentes ({dates}) sem rotulo contratual forte. "
                "A analise foi interrompida para evitar consulta BCB em competencia errada."
            )
        raise RuntimeError(
            "Nao foi possivel identificar com seguranca a data da contratacao no contrato. "
            "Sem essa data, a taxa historica correta do BCB nao pode ser consultada."
        )

    candidates.sort(key=lambda item: (-item[0], item[1]))
    strong_candidates = [item for item in candidates if item[0] >= 80]
    strong_months = {(item[1].year, item[1].month) for item in strong_candidates}
    if len(strong_months) > 1:
        dates = ", ".join(sorted({item[2] for item in strong_candidates}))
        raise RuntimeError(
            "Foram encontradas datas de contratacao conflitantes no contrato "
            f"({dates}). Como a taxa BCB depende do mes/ano da contratacao, "
            "a analise foi interrompida para evitar laudo com taxa historica errada."
        )

    top_score = candidates[0][0]
    top_candidates = [item for item in candidates if item[0] == top_score]
    top_months = {(item[1].year, item[1].month) for item in top_candidates}
    if len(top_months) > 1:
        dates = ", ".join(sorted({item[2] for item in top_candidates}))
        raise RuntimeError(
            "Foram encontradas datas de contratacao conflitantes no contrato "
            f"({dates}). Como a taxa BCB depende do mes/ano da contratacao, "
            "a analise foi interrompida para evitar laudo com taxa historica errada."
        )

    if top_score < 80:
        all_months = {(item[1].year, item[1].month) for item in candidates}
        if len(all_months) > 1:
            dates = ", ".join(sorted({item[2] for item in candidates}))
            raise RuntimeError(
                "Nao foi possivel determinar com seguranca a data da contratacao. "
                f"O documento contem datas em meses/anos diferentes ({dates}) sem rotulo contratual forte. "
                "A analise foi interrompida para evitar consulta BCB em competencia errada."
            )

    return candidates[0][2]


def _detect_contract_type_by_text(contract_text: str) -> tuple[str | None, float]:
    text = _normalize_text_for_match(contract_text)[:12000]
    if not text:
        return None, 0.0

    scores: dict[str, float] = {k: 0.0 for k in CONTRACT_TYPE_SIGNALS.keys()}
    for loan_kind, signal_groups in CONTRACT_TYPE_SIGNALS.items():
        for keyword in signal_groups.get("strong", ()):
            if keyword in text:
                scores[loan_kind] += 3.0
        for keyword in signal_groups.get("medium", ()):
            if keyword in text:
                scores[loan_kind] += 1.0

    winner = max(scores, key=scores.get)
    winner_score = scores[winner]
    if winner_score <= 0:
        return None, 0.0

    ordered_scores = sorted(scores.values(), reverse=True)
    second_score = ordered_scores[1] if len(ordered_scores) > 1 else 0.0
    confidence = winner_score / max(winner_score + second_score, 1.0)
    return winner, confidence


def _detect_blocking_contract_type_mismatch(selected_loan_type: str, contract_text: str) -> tuple[str | None, list[str]]:
    text = _normalize_text_for_match(contract_text)[:12000]
    selected = (selected_loan_type or "").strip().lower()
    if not text or not selected:
        return None, []

    candidates: dict[str, list[str]] = {}
    for loan_type, signal_groups in CONTRACT_TYPE_SIGNALS.items():
        evidences: list[str] = []
        for keyword in signal_groups.get("strong", ()):
            if keyword in text:
                evidences.append(keyword)
        medium_hits = [keyword for keyword in signal_groups.get("medium", ()) if keyword in text]

        # Bloqueamos apenas com evidencia forte: pelo menos 1 marcador forte,
        # ou 2 marcadores medios quando a modalidade nao conflita com outra.
        if evidences:
            candidates[loan_type] = evidences + medium_hits
        elif len(medium_hits) >= 2:
            candidates[loan_type] = medium_hits

    if selected in candidates:
        return None, []
    if len(candidates) != 1:
        return None, []

    detected_loan_type = next(iter(candidates.keys()))
    evidence = candidates[detected_loan_type]
    return detected_loan_type, evidence


def _mock_reference_rate_for(loan_type: str) -> float:
    normalized = (loan_type or "").strip().lower()
    return float(MOCK_REFERENCE_RATES.get(normalized, MOCK_REFERENCE_RATES["credito_pessoal"]))


def _build_mock_bcb_context(loan_type: str) -> dict[str, Any]:
    reference_rate = _mock_reference_rate_for(loan_type)
    annual_rate = round(((1 + (reference_rate / 100.0)) ** 12 - 1) * 100.0, 4)
    return {
        "loan_rate": {
            "loan_type": loan_type,
            "monthly_rate_pct": reference_rate,
            "annual_rate_pct": annual_rate,
            "abusivity_threshold_monthly_pct": round(reference_rate * 2, 4),
            "abusivity_threshold_annual_pct": round(((1 + ((reference_rate * 2) / 100.0)) ** 12 - 1) * 100.0, 2),
            "bcb_reference_date": "01/02/2026",
            "bcb_serie": "mock",
            "source_url": "mock://bcb",
            "fetched_at": datetime.now(UTC).isoformat(),
            "note": "Mock mode ativo: referencia deterministica para testes.",
        },
        "selic": {
            "selic_monthly_pct": 1.05,
            "selic_annual_pct": 13.34,
            "bcb_reference_date": "01/02/2026",
            "source_url_monthly": "mock://selic",
            "source_url_annual": "mock://selic",
            "fetched_at": datetime.now(UTC).isoformat(),
        },
        "cdi": {
            "cdi_monthly_pct": 1.01,
            "bcb_reference_date": "01/02/2026",
            "source_url": "mock://cdi",
            "fetched_at": datetime.now(UTC).isoformat(),
        },
        "inss_cap": None,
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def _build_loan_type_warning(selected_loan_type: str, contract_text: str) -> tuple[str | None, str | None]:
    predicted, confidence = _detect_contract_type_by_text(contract_text)
    if not predicted:
        return None, None
    if selected_loan_type == predicted:
        return None, None

    # So avisa quando o sinal textual estiver minimamente forte.
    if confidence < 0.55:
        return None, None

    message = (
        "Identificamos divergencias no contrato em relacao ao tipo informado. "
        "Para ver o laudo tecnico completo com os detalhes e o parecer da analise, prossiga para o pagamento."
    )
    return message, predicted


def _assert_contract_type_consistency(selected_loan_type: str, contract_text: str) -> None:
    """
    Fail-closed para evitar analise com taxa BCB de modalidade errada.
    Aplica para todas as modalidades suportadas.
    """
    selected = (selected_loan_type or "").strip().lower()
    detected, evidence = _detect_blocking_contract_type_mismatch(selected, contract_text)
    if not detected:
        return
    raise ContractTypeMismatchError(
        selected_loan_type=selected,
        detected_loan_type=detected,
        evidence=evidence,
    )


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


def _is_anthropic_credit_error(err: Exception) -> bool:
    msg = str(err or "").lower()
    indicators = [
        "credit",
        "credits",
        "billing",
        "quota",
        "insufficient",
        "balance",
        "rate limit",
        "429",
    ]
    return any(k in msg for k in indicators)


def _friendly_error_message(err: Exception) -> str:
    if isinstance(err, ContractTypeMismatchError):
        return str(err)
    if "data da contratacao" in str(err or "").lower():
        return str(err)
    if isinstance(err, BCBAPIError):
        return (
            "Nao conseguimos consultar as taxas oficiais do Banco Central no momento. "
            "Tente novamente em alguns minutos."
        )
    if _is_anthropic_credit_error(err):
        return (
            "As analises estao temporariamente indisponiveis por alta demanda no provedor de IA. "
            "Ja estamos normalizando. Tente novamente em breve."
        )
    return (
        "Nao foi possivel concluir a analise agora. "
        "Tente novamente em alguns minutos."
    )


def _strip_code_fences(raw: str) -> str:
    text = (raw or "").strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
    return text


def _extract_first_json_object(raw: str) -> str:
    text = (raw or "").strip()
    start = text.find("{")
    if start < 0:
        return text

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]

        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]

    return text[start:]


def _escape_control_chars_inside_strings(text: str) -> str:
    out: list[str] = []
    in_string = False
    escape = False

    for ch in text:
        if in_string:
            if escape:
                out.append(ch)
                escape = False
                continue

            if ch == "\\":
                out.append(ch)
                escape = True
                continue

            if ch == '"':
                out.append(ch)
                in_string = False
                continue

            if ch == "\n":
                out.append("\\n")
                continue
            if ch == "\r":
                out.append("\\r")
                continue
            if ch == "\t":
                out.append("\\t")
                continue

            out.append(ch)
            continue

        out.append(ch)
        if ch == '"':
            in_string = True

    if in_string:
        out.append('"')

    return "".join(out)


def _close_incomplete_json_object(text: str) -> str:
    depth = 0
    in_string = False
    escape = False
    for ch in text:
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth = max(0, depth - 1)

    repaired = text
    if depth > 0:
        repaired += "}" * depth
    return repaired


def _remove_trailing_commas(text: str) -> str:
    previous = None
    current = text
    while previous != current:
        previous = current
        current = re.sub(r",\s*([}\]])", r"\1", current)
    return current


def _build_json_candidates(raw: str) -> list[str]:
    cleaned = _strip_code_fences(raw).strip()
    extracted = _extract_first_json_object(cleaned).strip()

    candidates = []
    for base in [cleaned, extracted]:
        if not base:
            continue
        candidates.append(base)
        escaped = _escape_control_chars_inside_strings(base)
        candidates.append(escaped)
        candidates.append(_remove_trailing_commas(escaped))
        candidates.append(_remove_trailing_commas(_close_incomplete_json_object(escaped)))

    unique: list[str] = []
    seen = set()
    for item in candidates:
        if item and item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _loads_ai_json(raw: str) -> dict:
    last_exc: Exception | None = None
    for candidate in _build_json_candidates(raw):
        try:
            return json.loads(candidate)
        except Exception as exc:
            last_exc = exc
        try:
            return json.loads(candidate, strict=False)
        except Exception as exc:
            last_exc = exc

    raise last_exc if last_exc is not None else ValueError("Resposta JSON vazia")


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return float(default)
        if isinstance(value, str):
            value = value.strip().replace("%", "").replace(",", ".")
        return float(value)
    except Exception:
        return float(default)


def _as_brl_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return float(default)
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = (
                value.strip()
                .replace("R$", "")
                .replace("BRL", "")
                .replace(" ", "")
            )
            if "," in cleaned:
                cleaned = cleaned.replace(".", "").replace(",", ".")
            return float(cleaned)
        return float(value)
    except Exception:
        return float(default)


def _as_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return int(default)
        if isinstance(value, str):
            value = value.strip()
        return int(float(value))
    except Exception:
        return int(default)


def _normalize_ai_result(parsed: Any, loan_type: str, reference_rate: float) -> dict:
    data = parsed if isinstance(parsed, dict) else {}
    irregularidades_raw = data.get("irregularidades", [])
    irregularidades_norm = []
    if isinstance(irregularidades_raw, list):
        for item in irregularidades_raw:
            if not isinstance(item, dict):
                continue
            gravidade = str(item.get("gravidade", "media")).lower()
            if gravidade not in {"alta", "media", "baixa"}:
                gravidade = "media"
            irregularidades_norm.append(
                {
                    "tipo": str(item.get("tipo", "")).strip(),
                    "descricao": str(item.get("descricao", "")).strip(),
                    "gravidade": gravidade,
                    "valor_estimado": _as_float(item.get("valor_estimado", 0.0), 0.0),
                    "trecho_contrato": str(item.get("trecho_contrato", "")).strip(),
                    "fundamento_legal": str(item.get("fundamento_legal", "")).strip(),
                    "valor_cobrado": str(item.get("valor_cobrado", "")).strip(),
                }
            )

    dados_cliente_raw = data.get("dados_cliente", {})
    dados_cliente = {
        "nome": "",
        "cpf": "",
    }
    if isinstance(dados_cliente_raw, dict):
        dados_cliente["nome"] = str(dados_cliente_raw.get("nome", "")).strip()
        dados_cliente["cpf"] = str(dados_cliente_raw.get("cpf", "")).strip()

    return {
        # Nunca confiamos no tipo devolvido pela IA para evitar divergencia de modalidade.
        "tipo_contrato": loan_type,
        "banco_credor": str(data.get("banco_credor", "")).strip(),
        "numero_contrato": str(data.get("numero_contrato", "")).strip(),
        "data_contrato": str(data.get("data_contrato", "")).strip(),
        "valor_contratado": _as_float(data.get("valor_contratado", 0.0), 0.0),
        "taxa_mensal_contratada": _as_float(data.get("taxa_mensal_contratada", 0.0), 0.0),
        "taxa_anual_contratada": _as_float(data.get("taxa_anual_contratada", 0.0), 0.0),
        "cet_mensal": str(data.get("cet_mensal", "")).strip(),
        "cet_anual": str(data.get("cet_anual", "")).strip(),
        # Nunca confiamos na taxa de referencia devolvida pela IA.
        "taxa_referencia_bcb": float(reference_rate),
        "prazo_meses": _as_int(data.get("prazo_meses", 0), 0),
        "valor_parcela": str(data.get("valor_parcela", "")).strip(),
        "valor_total_devido": str(data.get("valor_total_devido", "")).strip(),
        "dados_cliente": dados_cliente,
        "irregularidades": irregularidades_norm,
        "resumo_tecnico": str(data.get("resumo_tecnico", "")).strip(),
        "recomendacao": str(data.get("recomendacao", "")).strip(),
    }


def _validate_ai_result_strict(ai_result: dict, reference_rate: float) -> None:
    required = [
        "tipo_contrato",
        "banco_credor",
        "valor_contratado",
        "taxa_mensal_contratada",
        "taxa_anual_contratada",
        "taxa_referencia_bcb",
        "prazo_meses",
        "irregularidades",
        "resumo_tecnico",
        "recomendacao",
    ]
    missing = [k for k in required if k not in ai_result]
    if missing:
        raise ValueError(f"JSON da IA incompleto. Campos ausentes: {', '.join(missing)}")

    if not str(ai_result.get("banco_credor", "")).strip():
        raise ValueError("JSON da IA invalido: banco_credor vazio.")
    if _as_float(ai_result.get("valor_contratado"), 0.0) <= 0:
        raise ValueError("JSON da IA invalido: valor_contratado <= 0.")
    if _as_int(ai_result.get("prazo_meses"), 0) <= 0:
        raise ValueError("JSON da IA invalido: prazo_meses <= 0.")
    if _as_float(ai_result.get("taxa_referencia_bcb"), 0.0) <= 0:
        raise ValueError(f"JSON da IA invalido: taxa_referencia_bcb invalida (ref: {reference_rate}).")

    resumo = str(ai_result.get("resumo_tecnico", "")).strip()
    recomendacao = str(ai_result.get("recomendacao", "")).strip()
    if len(resumo) < 40:
        raise ValueError("JSON da IA invalido: resumo_tecnico muito curto.")
    if len(recomendacao) < 20:
        raise ValueError("JSON da IA invalido: recomendacao muito curta.")

    irregularidades = ai_result.get("irregularidades")
    if not isinstance(irregularidades, list):
        raise ValueError("JSON da IA invalido: irregularidades nao e lista.")
    for idx, item in enumerate(irregularidades):
        if not isinstance(item, dict):
            raise ValueError(f"JSON da IA invalido: irregularidade {idx} nao e objeto.")
        if not str(item.get("tipo", "")).strip():
            raise ValueError(f"JSON da IA invalido: irregularidade {idx} sem tipo.")
        if not str(item.get("descricao", "")).strip():
            raise ValueError(f"JSON da IA invalido: irregularidade {idx} sem descricao.")
        gravidade = str(item.get("gravidade", "")).lower()
        if gravidade not in {"alta", "media", "baixa"}:
            raise ValueError(f"JSON da IA invalido: irregularidade {idx} com gravidade invalida.")
        if _as_float(item.get("valor_estimado"), -1.0) < 0:
            raise ValueError(f"JSON da IA invalido: irregularidade {idx} com valor_estimado negativo.")


def _needs_textual_enrichment(ai_result: dict) -> bool:
    resumo = str(ai_result.get("resumo_tecnico", "")).strip()
    recomendacao = str(ai_result.get("recomendacao", "")).strip()
    return len(resumo) < 40 or len(recomendacao) < 20


def _reference_rate_with_date(ai_result: dict, reference_rate: float) -> str:
    ref_date = str(ai_result.get("bcb_reference_date", "")).strip()
    if ref_date:
        return f"{reference_rate:.2f}% ao mes (BCB em {ref_date})"
    return f"{reference_rate:.2f}% ao mes"


def _compose_fallback_resumo(ai_result: dict, reference_rate: float) -> str:
    banco = str(ai_result.get("banco_credor", "")).strip() or "a instituicao financeira"
    taxa = _as_float(ai_result.get("taxa_mensal_contratada"), 0.0)
    prazo = _as_int(ai_result.get("prazo_meses"), 0)
    irregularidades = ai_result.get("irregularidades", [])
    reference_text = _reference_rate_with_date(ai_result, reference_rate)

    if irregularidades:
        principais = ", ".join(
            str(item.get("tipo", "")).strip()
            for item in irregularidades[:3]
            if str(item.get("tipo", "")).strip()
        )
        if not principais:
            principais = "indicios tecnicos de irregularidade"
        return (
            f"A analise tecnica do contrato com {banco} identificou {len(irregularidades)} "
            f"irregularidade(s), com destaque para {principais}. "
            f"A taxa mensal informada foi de {taxa:.2f}% ao mes, em comparacao com a referencia "
            f"do BCB de {reference_text}, considerando prazo de {prazo} meses."
        )

    return (
        f"A analise tecnica do contrato com {banco} nao encontrou irregularidades objetivas "
        f"nos campos estruturados avaliados. A taxa mensal considerada foi de {taxa:.2f}% ao mes, "
        f"comparada com a referencia do BCB de {reference_text}, para prazo de {prazo} meses."
    )


def _compose_fallback_recomendacao(ai_result: dict) -> str:
    irregularidades = ai_result.get("irregularidades", [])
    if irregularidades:
        return (
            "Recomenda-se revisar o laudo completo e submeter o contrato a avaliacao juridica "
            "especializada para confirmar a estrategia adequada de revisao contratual."
        )
    return (
        "Recomenda-se arquivar o laudo completo como registro tecnico e, em caso de nova cobranca "
        "ou alteracao contratual, realizar nova conferencia especializada."
    )


def _finalize_ai_result_text_fields(ai_result: dict, reference_rate: float) -> dict:
    finalized = dict(ai_result)
    resumo = str(finalized.get("resumo_tecnico", "")).strip()
    recomendacao = str(finalized.get("recomendacao", "")).strip()

    if len(resumo) < 40:
        finalized["resumo_tecnico"] = _compose_fallback_resumo(finalized, reference_rate)
    if len(recomendacao) < 20:
        finalized["recomendacao"] = _compose_fallback_recomendacao(finalized)

    return finalized


def _mentions_no_irregularity(text: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized:
        return False
    markers = [
        "nao encontrou irregularidade",
        "não encontrou irregularidade",
        "nenhuma irregularidade",
        "sem irregularidade",
    ]
    return any(marker in normalized for marker in markers)


def _enforce_result_consistency(
    ai_result: dict,
    reference_rate: float,
    impact_data: dict[str, Any],
) -> dict:
    """
    Evita laudos contraditorios: se houver cobranca excessiva material,
    o resultado nao pode concluir "sem irregularidades".
    """
    result = dict(ai_result)
    irregularidades = result.get("irregularidades")
    if not isinstance(irregularidades, list):
        irregularidades = []
        result["irregularidades"] = irregularidades

    impacto = _as_float(impact_data.get("estimated_overcharge_brl"), 0.0)
    taxa_contratada = _as_float(result.get("taxa_mensal_contratada"), 0.0)
    taxa_ref = _as_float(reference_rate, 0.0)
    reference_text = _reference_rate_with_date(result, reference_rate)
    has_material_gap = taxa_contratada > 0 and taxa_ref > 0 and taxa_contratada > (taxa_ref * 1.05)

    if impacto > 0 and has_material_gap and len(irregularidades) > 0:
        for item in irregularidades:
            if not isinstance(item, dict):
                continue
            issue_text = " ".join(
                str(item.get(key, ""))
                for key in ("tipo", "descricao", "fundamento_legal")
            ).lower()
            is_rate_issue = (
                "taxa" in issue_text
                or "juros" in issue_text
                or "bcb" in issue_text
                or "referencia de mercado" in issue_text
                or "referência de mercado" in issue_text
            )
            if not is_rate_issue:
                continue
            item["valor_estimado"] = float(round(impacto, 2))
            item["descricao"] = (
                f"A taxa contratada de {taxa_contratada:.2f}% a.m. esta acima da "
                f"taxa media de referencia do BCB ({reference_text}), com impacto "
                f"financeiro estimado de {_as_float(impacto, 0.0):.2f} BRL ao longo do contrato."
            )

    if impacto > 0 and has_material_gap and len(irregularidades) == 0:
        gravidade = "alta" if taxa_contratada >= (taxa_ref * 2.0) else "media"
        irregularidades.append(
            {
                "tipo": "Taxa de juros acima da referencia de mercado (BCB)",
                "descricao": (
                    f"A taxa contratada de {taxa_contratada:.2f}% a.m. esta acima da "
                    f"taxa media de referencia do BCB ({reference_text}), com impacto "
                    f"financeiro estimado de {_as_float(impacto, 0.0):.2f} BRL ao longo do contrato."
                ),
                "gravidade": gravidade,
                "valor_estimado": float(round(impacto, 2)),
                "trecho_contrato": "",
                "fundamento_legal": "Comparacao tecnica com taxa media divulgada pelo Banco Central do Brasil.",
                "valor_cobrado": "",
            }
        )

    resumo = str(result.get("resumo_tecnico", "")).strip()
    recomendacao = str(result.get("recomendacao", "")).strip()
    if irregularidades and (_mentions_no_irregularity(resumo) or len(resumo) < 40):
        result["resumo_tecnico"] = _compose_fallback_resumo(result, reference_rate)
    if irregularidades and (_mentions_no_irregularity(recomendacao) or len(recomendacao) < 20):
        result["recomendacao"] = _compose_fallback_recomendacao(result)

    return result


def _analysis_tool_schema(reference_rate: float) -> dict:
    return {
        "type": "object",
        "properties": {
            "tipo_contrato": {"type": "string"},
            "banco_credor": {"type": "string"},
            "numero_contrato": {"type": "string"},
            "data_contrato": {"type": "string"},
            "valor_contratado": {"type": "number"},
            "taxa_mensal_contratada": {"type": "number"},
            "taxa_anual_contratada": {"type": "number"},
            "cet_mensal": {"type": "string"},
            "cet_anual": {"type": "string"},
            "taxa_referencia_bcb": {"type": "number"},
            "prazo_meses": {"type": "integer"},
            "valor_parcela": {"type": "string"},
            "valor_total_devido": {"type": "string"},
            "dados_cliente": {
                "type": "object",
                "properties": {
                    "nome": {"type": "string"},
                    "cpf": {"type": "string"},
                },
                "required": ["nome", "cpf"],
            },
            "irregularidades": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "tipo": {"type": "string"},
                        "descricao": {"type": "string"},
                        "gravidade": {"type": "string", "enum": ["alta", "media", "baixa"]},
                        "valor_estimado": {"type": "number"},
                        "trecho_contrato": {"type": "string"},
                        "fundamento_legal": {"type": "string"},
                        "valor_cobrado": {"type": "string"},
                    },
                    "required": ["tipo", "descricao", "gravidade", "valor_estimado"],
                },
            },
            "resumo_tecnico": {"type": "string"},
            "recomendacao": {"type": "string"},
        },
        "required": [
            "tipo_contrato",
            "banco_credor",
            "valor_contratado",
            "taxa_mensal_contratada",
            "taxa_anual_contratada",
            "taxa_referencia_bcb",
            "prazo_meses",
            "irregularidades",
            "resumo_tecnico",
            "recomendacao",
        ],
    }


def _extract_tool_use_input(resp: Any, tool_name: str) -> dict | None:
    for block in getattr(resp, "content", []) or []:
        block_type = getattr(block, "type", None) or (block.get("type") if isinstance(block, dict) else None)
        block_name = getattr(block, "name", None) or (block.get("name") if isinstance(block, dict) else None)
        if block_type == "tool_use" and block_name == tool_name:
            block_input = getattr(block, "input", None)
            if block_input is None and isinstance(block, dict):
                block_input = block.get("input")
            if isinstance(block_input, dict):
                return block_input
    return None


def _extract_text_blocks(resp: Any) -> str:
    chunks: list[str] = []
    for block in getattr(resp, "content", []) or []:
        block_type = getattr(block, "type", None) or (block.get("type") if isinstance(block, dict) else None)
        if block_type != "text":
            continue
        txt = getattr(block, "text", None)
        if txt is None and isinstance(block, dict):
            txt = block.get("text")
        if txt:
            chunks.append(str(txt))
    return "\n".join(chunks).strip()


async def _repair_ai_json_with_model(
    client,
    malformed_json: str,
    reference_rate: float,
    model_name: str,
) -> dict:
    system_prompt = (
        "Voce recebe um JSON malformado e deve devolver APENAS um JSON valido. "
        "Nao invente dados fora do que ja existe; apenas repare formato e escapes."
    )

    user_prompt = (
        "Conserte para JSON valido no esquema abaixo e responda SOMENTE o JSON:\n\n"
        "{\n"
        "  \"tipo_contrato\": \"string\",\n"
        "  \"banco_credor\": \"string\",\n"
        "  \"numero_contrato\": \"string\",\n"
        "  \"data_contrato\": \"string\",\n"
        "  \"valor_contratado\": 0.00,\n"
        "  \"taxa_mensal_contratada\": 0.00,\n"
        "  \"taxa_anual_contratada\": 0.00,\n"
        "  \"cet_mensal\": \"string\",\n"
        "  \"cet_anual\": \"string\",\n"
        f"  \"taxa_referencia_bcb\": {reference_rate},\n"
        "  \"prazo_meses\": 0,\n"
        "  \"valor_parcela\": \"string\",\n"
        "  \"valor_total_devido\": \"string\",\n"
        "  \"dados_cliente\": {\"nome\": \"string\", \"cpf\": \"string\"},\n"
        "  \"irregularidades\": [\n"
        "    {\n"
        "      \"tipo\": \"string\",\n"
        "      \"descricao\": \"string\",\n"
        "      \"gravidade\": \"alta|media|baixa\",\n"
        "      \"valor_estimado\": 0.00,\n"
        "      \"trecho_contrato\": \"string\",\n"
        "      \"fundamento_legal\": \"string\",\n"
        "      \"valor_cobrado\": \"string\"\n"
        "    }\n"
        "  ],\n"
        "  \"resumo_tecnico\": \"string\",\n"
        "  \"recomendacao\": \"string\"\n"
        "}\n\n"
        "JSON malformado de entrada:\n"
        f"{malformed_json[:12000]}"
    )

    resp = await client.messages.create(
        model=model_name,
        max_tokens=1400,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    repaired_raw = (resp.content[0].text or "").strip()
    return _loads_ai_json(repaired_raw)


async def analyze_contract(
    contract_text: str,
    loan_type: str,
    reference_rate: float,
    image_pages: Optional[list] = None,
    bcb_context: str = "",
) -> tuple[dict, dict[str, int], str]:
    if _is_mock_ai_mode():
        return _mock_result(loan_type, reference_rate), {
            "input_tokens": 0,
            "output_tokens": 0,
        }, "mock-model"

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    system_prompt = f"""Voce e um analista financeiro especializado em direito bancario brasileiro.
Analise contratos de emprestimo/financiamento identificando irregularidades TECNICAS e MATEMATICAS.
Nao preste assessoria juridica — apenas analise tecnica.

{bcb_context if bcb_context else ""}

INSTRUCOES:
- Use exclusivamente o texto do contrato enviado e os dados oficiais de API informados acima.
- Nao use documentos locais do projeto, conhecimento pre-carregado ou referencias externas nao fornecidas no contexto.
- Analise o contrato inteiro disponibilizado, incluindo quadros-resumo, CCB, anexos, demonstrativos, autorizacoes, termos de seguro/garantia e relatorios de assinatura.
- Padronize a referencia como "taxa media de mercado (BCB)" em descricoes e resumo.
- Compare a taxa contratada com a taxa media de mercado (BCB) fornecida acima.
- Se estimar excesso por taxa de juros, use sistema Price: compare a parcela contratada com a parcela recalculada pela taxa BCB da data do contrato.
- Verifique apenas o que estiver suportado pelo contrato e pelo contexto oficial acima
- Para consignado: verifique se o desconto respeita o limite de 35% do beneficio
- Extraia do contrato, sempre que estiverem disponiveis: numero do contrato, data do contrato, valor total liberado,
  valor da parcela, total a pagar, CET mensal/anual, nome e CPF do contratante.
- Para cartao de credito, quando nao houver valor liberado, use o limite de credito, saldo financiado ou saldo devedor
  identificado no contrato/fatura como `valor_contratado`, deixando claro no resumo qual base foi usada.
- Procure e acuse todas as irregularidades tecnicas objetivamente suportadas pelo texto, especialmente:
  1. taxa remuneratoria acima da taxa media de mercado (BCB);
  2. divergencia entre taxa mensal, taxa anual, CET, parcelas, valor liberado, valor financiado e total a pagar;
  3. juros de mora, multa, encargos de atraso, honorarios/cobranca extrajudicial e vencimento antecipado;
  4. tarifas, tarifa de cadastro, prestacao de servico/garantia, seguro prestamista, seguro/garantia desemprego, MIP/DFI e cobranças acessorias;
  5. possivel venda casada quando seguro/garantia/produto acessorio aparecer embutido, pre-selecionado, financiado, obrigatorio ou sem prova clara de opcionalidade;
  6. clausulas de foro, eleicao de foro, cessao/endosso, autorizacao de desconto, margem consignavel, uso de verbas rescisorias, liquidacao antecipada e tratamento de dados;
  7. ausencia de informacoes obrigatorias ou falta de transparencia sobre CET, amortizacao, valor total, tarifas, seguros e base de calculo.
- Nao limite a analise a juros: se houver clausula, tarifa, seguro, mora, foro ou anexo com possivel irregularidade tecnica, inclua em `irregularidades`.
- Em cada irregularidade, inclua o trecho contratual relevante, o fundamento legal ou normativo e o valor cobrado,
  quando esses dados estiverem presentes no documento.
- `resumo_tecnico` deve ter ao menos 2 frases completas e explicar os principais achados.
- `recomendacao` deve ter ao menos 1 frase completa, objetiva e acionavel.

Voce deve registrar o resultado usando a ferramenta `submit_analysis`.
Nao escreva explicacoes fora da ferramenta.
Estrutura obrigatoria:
{{
  "tipo_contrato": "string",
  "banco_credor": "string",
  "numero_contrato": "string",
  "data_contrato": "string",
  "valor_contratado": 0.00,
  "taxa_mensal_contratada": 0.00,
  "taxa_anual_contratada": 0.00,
  "cet_mensal": "string",
  "cet_anual": "string",
  "taxa_referencia_bcb": {reference_rate},
  "prazo_meses": 0,
  "valor_parcela": "string",
  "valor_total_devido": "string",
  "dados_cliente": {{
    "nome": "string",
    "cpf": "string"
  }},
  "irregularidades": [
    {{
      "tipo": "string",
      "descricao": "string",
      "gravidade": "alta|media|baixa",
      "valor_estimado": 0.00,
      "trecho_contrato": "string",
      "fundamento_legal": "string",
      "valor_cobrado": "string"
    }}
  ],
  "resumo_tecnico": "string",
  "recomendacao": "string"
}}"""

    text_limit = _contract_text_char_limit()
    if image_pages:
        content = []
        if contract_text:
            content.append({"type": "text", "text": f"Texto extraido:\n{contract_text[:min(text_limit, 12000)]}"})
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
            "content": f"Analise este contrato de {loan_type}:\n\n{contract_text[:text_limit]}",
        }]

    total_input_tokens = 0
    total_output_tokens = 0
    models = _analysis_model_candidates()
    attempts_per_model = _analysis_max_attempts_per_model()
    last_error: Exception | None = None

    for model_name in models:
        for attempt in range(1, attempts_per_model + 1):
            try:
                tool_name = "submit_analysis"
                resp = await client.messages.create(
                    model=model_name,
                    max_tokens=_max_output_tokens(),
                    system=system_prompt,
                    messages=messages,
                    tools=[{
                        "name": tool_name,
                        "description": "Submete o resultado estruturado da analise do contrato.",
                        "input_schema": _analysis_tool_schema(reference_rate),
                    }],
                    tool_choice={"type": "tool", "name": tool_name},
                )

                usage = getattr(resp, "usage", None)
                if usage is not None:
                    total_input_tokens += int(getattr(usage, "input_tokens", 0) or 0)
                    total_output_tokens += int(getattr(usage, "output_tokens", 0) or 0)

                parsed = _extract_tool_use_input(resp, tool_name)
                if parsed is None:
                    raw = _extract_text_blocks(resp)
                    try:
                        parsed = _loads_ai_json(raw)
                    except Exception:
                        parsed = await _repair_ai_json_with_model(
                            client=client,
                            malformed_json=raw,
                            reference_rate=reference_rate,
                            model_name=model_name,
                        )

                normalized = _normalize_ai_result(parsed, loan_type, reference_rate)
                normalized = _finalize_ai_result_text_fields(normalized, reference_rate)
                _validate_ai_result_strict(normalized, reference_rate)

                return normalized, {
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                }, model_name
            except Exception as exc:
                last_error = exc
                print(
                    "[analysis] tentativa falhou "
                    f"(model={model_name}, attempt={attempt}/{attempts_per_model}): {exc}"
                )

    raise RuntimeError(
        "Nao foi possivel gerar um laudo consistente apos multiplas tentativas de IA. "
        f"Ultimo erro: {last_error}"
    )


async def precheck_contract_has_issues(
    contract_text: str,
    loan_type: str,
    reference_rate: float,
) -> bool:
    """
    Pre-analise barata para converter: responde apenas TEM/NAO irregularidades.
    """
    if _is_mock_ai_mode():
        return True

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    limited_text = (contract_text or "")[:4500]

    system_prompt = (
        "Voce classifica contratos de credito no Brasil.\n"
        "Com base no texto e na taxa media BCB informada, responda somente se ha indicio de irregularidade.\n"
        "Responda EXATAMENTE em JSON valido no formato: {\"has_issues\": true|false}\n"
        "Sem explicacoes adicionais."
    )

    user_prompt = (
        f"Tipo de contrato: {loan_type}\n"
        f"Taxa media BCB de referencia: {reference_rate:.4f}% a.m.\n"
        "Analise apenas de forma preliminar (sem laudo completo).\n\n"
        f"Texto do contrato:\n{limited_text}"
    )

    resp = await client.messages.create(
        model=MODEL_NAME,
        max_tokens=_precheck_max_output_tokens(),
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw = (resp.content[0].text or "").strip()
    try:
        data = _loads_ai_json(raw)
    except Exception:
        # Fallback conservador para nao bloquear pre-analise por JSON imperfeito.
        return False
    return bool(data.get("has_issues", False))


# ── Calculo de impacto ────────────────────────────────────────────────────────

def calculate_financial_impact(ai_result: dict, reference_rate: float) -> dict:
    irregularidades = ai_result.get("irregularidades", [])
    if not isinstance(irregularidades, list):
        irregularidades = []

    taxa = _as_float(ai_result.get("taxa_mensal_contratada"), 0.0)
    valor = _as_brl_float(ai_result.get("valor_contratado"), 0.0)
    prazo = _as_int(ai_result.get("prazo_meses"), 0)

    rate_overcharge = 0.0
    if taxa > reference_rate and valor > 0 and prazo > 0:
        ref_monthly_rate = reference_rate / 100.0
        if ref_monthly_rate > 0:
            ref_payment = valor * ref_monthly_rate / (1 - (1 + ref_monthly_rate) ** (-prazo))
        else:
            ref_payment = valor / prazo

        actual_payment = _as_brl_float(ai_result.get("valor_parcela"), 0.0)
        if actual_payment <= 0:
            contracted_monthly_rate = taxa / 100.0
            if contracted_monthly_rate > 0:
                actual_payment = valor * contracted_monthly_rate / (
                    1 - (1 + contracted_monthly_rate) ** (-prazo)
                )
            else:
                actual_payment = valor / prazo

        rate_overcharge = max(0.0, (actual_payment - ref_payment) * prazo)

    other_irregularities_total = 0.0
    for item in irregularidades:
        if not isinstance(item, dict):
            continue
        issue_text = " ".join(
            str(item.get(key, ""))
            for key in ("tipo", "descricao", "fundamento_legal")
        ).lower()
        is_rate_issue = (
            "taxa" in issue_text
            or "juros" in issue_text
            or "bcb" in issue_text
            or "referencia de mercado" in issue_text
            or "referência de mercado" in issue_text
        )
        if not is_rate_issue:
            other_irregularities_total += _as_brl_float(item.get("valor_estimado"), 0.0)

    total = rate_overcharge + other_irregularities_total

    return {
        "estimated_overcharge_brl": round(total, 2),
        "taxa_contratada": taxa,
        "taxa_referencia": reference_rate,
        "irregularidades_count": len(irregularidades),
    }


async def run_pre_analysis(
    contract_id: int,
    analysis_id: int,
    file_bytes: bytes,
    file_type: str,
    loan_type: str,
) -> None:
    """
    Pre-analise antes do pagamento: define apenas se ha ou nao indicios de irregularidades.
    Nao gera laudo completo nem detalhes premium.
    """
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
            extracted_text = ""
            if file_type == "pdf":
                extracted_text = extract_text_from_pdf(file_bytes)
                if len((extracted_text or "").strip()) < 200:
                    extracted_text = ocr_pdf(file_bytes)

            if len((extracted_text or "").strip()) < 60:
                raise RuntimeError("Nao foi possivel extrair texto suficiente do PDF para pre-analise.")

            contract_reference_date = _extract_contract_reference_date(extracted_text)

            warning_message, _suggested = _build_loan_type_warning(
                selected_loan_type=loan_type,
                contract_text=extracted_text,
            )
            analysis.error_message = warning_message
            await db.commit()
            _assert_contract_type_consistency(
                selected_loan_type=loan_type,
                contract_text=extracted_text,
            )

            if _is_mock_ai_mode():
                bcb_rate_data = _build_mock_bcb_context(loan_type)
            else:
                bcb_rate_data = await asyncio.wait_for(
                    get_enriched_bcb_context(
                        loan_type,
                        force_refresh=True,
                        reference_date=contract_reference_date,
                    ),
                    timeout=20,
                )
            reference_rate = float((bcb_rate_data.get("loan_rate") or {}).get("monthly_rate_pct") or 0.0)
            if reference_rate <= 0:
                raise RuntimeError("Taxa BCB indisponivel para pre-analise.")

            has_issues = await precheck_contract_has_issues(
                contract_text=extracted_text,
                loan_type=loan_type,
                reference_rate=reference_rate,
            )

            analysis.status = AnalysisStatus.COMPLETED
            analysis.has_issues = has_issues
            analysis.irregularities_count = 1 if has_issues else 0
            analysis.impact_brl = 0.0
            analysis.bcb_rate_pct = reference_rate
            analysis.completed_at = datetime.now(UTC).replace(tzinfo=None)
            # Importante: detalhes premium permanecem bloqueados ate pagamento.
            analysis.ai_result_json = None
            await db.commit()

        except Exception as e:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = _friendly_error_message(e)[:500]
            await db.commit()
            await send_ops_alert(
                event="pre_analysis_failed",
                message="Falha na pre-analise antes do pagamento.",
                metadata={
                    "analysis_id": analysis_id,
                    "contract_id": contract_id,
                    "raw_error": str(e)[:300],
                },
            )


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
    from models import Analysis, AnalysisTelemetry
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis:
            return

        analysis.status = AnalysisStatus.PROCESSING
        await db.commit()

        input_tokens = 0
        output_tokens = 0
        duration_ms = 0
        max_output_tokens = _max_output_tokens()
        selected_model = _analysis_model_candidates()[0]

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

            _assert_contract_type_consistency(
                selected_loan_type=loan_type,
                contract_text=extracted_text,
            )
            contract_reference_date = _extract_contract_reference_date(extracted_text)

            # 2. Busca taxa BCB historica na data da contratacao
            # BCBAPIError e levantada se a API do BCB estiver indisponivel — nao existem fallbacks
            if _is_mock_ai_mode():
                bcb_ctx_data = _build_mock_bcb_context(loan_type)
            else:
                try:
                    bcb_ctx_data = await asyncio.wait_for(
                        get_enriched_bcb_context(
                            loan_type,
                            force_refresh=True,
                            reference_date=contract_reference_date,
                        ),
                        timeout=20,
                    )
                except BCBAPIError as e:
                    raise RuntimeError(
                        f"API do Banco Central (BCB) indisponivel no momento. "
                        f"Nao e possivel realizar a analise sem as taxas oficiais de mercado. "
                        f"Detalhe tecnico: {e}"
                    ) from e
                except asyncio.TimeoutError:
                    raise RuntimeError(
                        "Timeout ao consultar a API do Banco Central (BCB). "
                        "Tente novamente em alguns minutos."
                    )

            bcb_loan = bcb_ctx_data.get("loan_rate", {})
            reference_rate = bcb_loan.get("monthly_rate_pct")
            if not reference_rate:
                raise RuntimeError(
                    "BCB retornou taxa zerada ou ausente para a modalidade solicitada. "
                    "Analise interrompida para garantir precisao dos dados."
                )

            bcb_loan["requested_reference_date"] = contract_reference_date
            bcb_prompt_ctx = format_bcb_context_for_prompt(bcb_ctx_data)

            print(
                f"[analysis] BCB rate: {reference_rate}% a.m. "
                f"(serie {bcb_loan.get('bcb_serie')}, ref {bcb_loan.get('bcb_reference_date')}) "
                f"| contrato em {contract_reference_date}"
            )

            # 3. Analise Claude com contexto enriquecido
            started_at = perf_counter()
            ai_result, usage, selected_model = await analyze_contract(
                contract_text=extracted_text,
                loan_type=loan_type,
                reference_rate=reference_rate,
                image_pages=image_pages if image_pages else None,
                bcb_context=bcb_prompt_ctx,
            )
            duration_ms = int((perf_counter() - started_at) * 1000)
            input_tokens = int((usage or {}).get("input_tokens", 0) or 0)
            output_tokens = int((usage or {}).get("output_tokens", 0) or 0)

            ai_result["bcb_reference_date"] = bcb_loan.get("bcb_reference_date", "")
            ai_result["bcb_requested_reference_date"] = contract_reference_date
            ai_result["bcb_serie"] = bcb_loan.get("bcb_serie", "")
            ai_result["bcb_source_url"] = bcb_loan.get("source_url", "")

            # 4. Impacto financeiro
            impact_data = calculate_financial_impact(ai_result, reference_rate)
            ai_result = _enforce_result_consistency(ai_result, reference_rate, impact_data)
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
            analysis.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await db.commit()

            try:
                telemetry_result = await db.execute(
                    select(AnalysisTelemetry).where(AnalysisTelemetry.analysis_id == analysis_id)
                )
                telemetry = telemetry_result.scalar_one_or_none()
                if telemetry is None:
                    telemetry = AnalysisTelemetry(analysis_id=analysis_id)
                    db.add(telemetry)

                estimated_usd, estimated_brl = _estimate_cost(input_tokens, output_tokens)
                telemetry.model_name = selected_model
                telemetry.max_output_tokens = max_output_tokens
                telemetry.input_tokens = input_tokens
                telemetry.output_tokens = output_tokens
                telemetry.estimated_cost_usd = estimated_usd
                telemetry.estimated_cost_brl = estimated_brl
                telemetry.duration_ms = duration_ms
                telemetry.status = AnalysisStatus.COMPLETED
                telemetry.error_type = None
                await db.commit()
            except Exception as telemetry_err:
                await db.rollback()
                print(f"[analysis] aviso: telemetria nao salva para analise {analysis_id}: {telemetry_err}")

        except Exception as e:
            try:
                analysis.status = AnalysisStatus.FAILED
                analysis.error_message = _friendly_error_message(e)[:500]
                await db.commit()
            except Exception as commit_err:
                await db.rollback()
                print(f"[analysis] aviso: falha ao persistir status FAILED da analise {analysis_id}: {commit_err}")

            try:
                telemetry_result = await db.execute(
                    select(AnalysisTelemetry).where(AnalysisTelemetry.analysis_id == analysis_id)
                )
                telemetry = telemetry_result.scalar_one_or_none()
                if telemetry is None:
                    telemetry = AnalysisTelemetry(analysis_id=analysis_id)
                    db.add(telemetry)

                estimated_usd, estimated_brl = _estimate_cost(input_tokens, output_tokens)
                telemetry.model_name = selected_model
                telemetry.max_output_tokens = max_output_tokens
                telemetry.input_tokens = input_tokens
                telemetry.output_tokens = output_tokens
                telemetry.estimated_cost_usd = estimated_usd
                telemetry.estimated_cost_brl = estimated_brl
                telemetry.duration_ms = duration_ms
                telemetry.status = AnalysisStatus.FAILED
                telemetry.error_type = type(e).__name__[:80]
                await db.commit()
            except Exception as telemetry_err:
                await db.rollback()
                print(f"[analysis] aviso: telemetria de falha nao salva para analise {analysis_id}: {telemetry_err}")

            if _is_anthropic_credit_error(e):
                await send_ops_alert(
                    event="ai_provider_quota_or_credit_issue",
                    message="Falha de analise por limite de credito/quota da IA.",
                    metadata={
                        "analysis_id": analysis_id,
                        "contract_id": contract_id,
                        "user_email": user_email,
                        "raw_error": str(e)[:300],
                    },
                )
            else:
                await send_ops_alert(
                    event="ai_analysis_failed",
                    message="Falha na analise de contrato.",
                    metadata={
                        "analysis_id": analysis_id,
                        "contract_id": contract_id,
                        "user_email": user_email,
                        "raw_error": str(e)[:300],
                    },
                )
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
