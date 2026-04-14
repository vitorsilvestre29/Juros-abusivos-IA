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
from datetime import datetime
from typing import Any, Optional

from services.bcb_service import get_enriched_bcb_context, format_bcb_context_for_prompt, BCBAPIError
from services.stj_service import get_stj_context, format_stj_context_for_prompt
from services.ops_alert_service import send_ops_alert
from models import AnalysisStatus

MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"
MODEL_NAME = "claude-sonnet-4-6"


def _max_output_tokens() -> int:
    """
    Controle via ambiente para ajuste gradual de custo x qualidade.
    Default: 2000.
    """
    raw = os.getenv("AI_MAX_OUTPUT_TOKENS", "2000")
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


def _detect_contract_type_by_text(contract_text: str) -> tuple[str | None, float]:
    text = _normalize_text_for_match(contract_text)[:12000]
    if not text:
        return None, 0.0

    rules: dict[str, list[str]] = {
        "consignado_inss": [
            "inss", "beneficio previdenciario", "aposentadoria", "pensionista", "margem consignavel"
        ],
        "consignado_clt": [
            "desconto em folha", "folha de pagamento", "empregador", "holerite", "consignado privado"
        ],
        "credito_pessoal": [
            "emprestimo pessoal", "credito pessoal", "parcelas fixas", "cec", "contrato de emprestimo"
        ],
        "credito_habitacional": [
            "financiamento imobiliario", "alienacao fiduciaria do imovel", "sistema financeiro da habitacao",
            "sfh", "sfi", "imovel"
        ],
        "cdc_veiculo": [
            "veiculo", "automovel", "renavam", "chassi", "financiamento de veiculo", "alienacao fiduciaria do veiculo"
        ],
        "cartao_credito": [
            "cartao de credito", "fatura", "limite de credito", "pagamento minimo", "rotativo", "anuidade"
        ],
    }

    scores: dict[str, float] = {k: 0.0 for k in rules.keys()}
    for loan_kind, keywords in rules.items():
        for keyword in keywords:
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


def _build_loan_type_warning(selected_loan_type: str, contract_text: str) -> tuple[str | None, str | None]:
    predicted, confidence = _detect_contract_type_by_text(contract_text)
    if not predicted or predicted == "outros":
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
                }
            )

    return {
        "tipo_contrato": str(data.get("tipo_contrato", loan_type)).strip() or loan_type,
        "banco_credor": str(data.get("banco_credor", "")).strip(),
        "valor_contratado": _as_float(data.get("valor_contratado", 0.0), 0.0),
        "taxa_mensal_contratada": _as_float(data.get("taxa_mensal_contratada", 0.0), 0.0),
        "taxa_anual_contratada": _as_float(data.get("taxa_anual_contratada", 0.0), 0.0),
        "taxa_referencia_bcb": _as_float(data.get("taxa_referencia_bcb", reference_rate), reference_rate),
        "prazo_meses": _as_int(data.get("prazo_meses", 0), 0),
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


def _compose_fallback_resumo(ai_result: dict, reference_rate: float) -> str:
    banco = str(ai_result.get("banco_credor", "")).strip() or "a instituicao financeira"
    taxa = _as_float(ai_result.get("taxa_mensal_contratada"), 0.0)
    prazo = _as_int(ai_result.get("prazo_meses"), 0)
    irregularidades = ai_result.get("irregularidades", [])

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
            f"do BCB de {reference_rate:.2f}% ao mes, considerando prazo de {prazo} meses."
        )

    return (
        f"A analise tecnica do contrato com {banco} nao encontrou irregularidades objetivas "
        f"nos campos estruturados avaliados. A taxa mensal considerada foi de {taxa:.2f}% ao mes, "
        f"comparada com a referencia do BCB de {reference_rate:.2f}% ao mes, para prazo de {prazo} meses."
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


def _analysis_tool_schema(reference_rate: float) -> dict:
    return {
        "type": "object",
        "properties": {
            "tipo_contrato": {"type": "string"},
            "banco_credor": {"type": "string"},
            "valor_contratado": {"type": "number"},
            "taxa_mensal_contratada": {"type": "number"},
            "taxa_anual_contratada": {"type": "number"},
            "taxa_referencia_bcb": {"type": "number"},
            "prazo_meses": {"type": "integer"},
            "irregularidades": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "tipo": {"type": "string"},
                        "descricao": {"type": "string"},
                        "gravidade": {"type": "string", "enum": ["alta", "media", "baixa"]},
                        "valor_estimado": {"type": "number"},
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
        "  \"valor_contratado\": 0.00,\n"
        "  \"taxa_mensal_contratada\": 0.00,\n"
        "  \"taxa_anual_contratada\": 0.00,\n"
        f"  \"taxa_referencia_bcb\": {reference_rate},\n"
        "  \"prazo_meses\": 0,\n"
        "  \"irregularidades\": [\n"
        "    {\n"
        "      \"tipo\": \"string\",\n"
        "      \"descricao\": \"string\",\n"
        "      \"gravidade\": \"alta|media|baixa\",\n"
        "      \"valor_estimado\": 0.00\n"
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
    stj_context: str = "",
) -> tuple[dict, dict[str, int], str]:
    if MOCK_MODE:
        return _mock_result(loan_type, reference_rate), {
            "input_tokens": 0,
            "output_tokens": 0,
        }, "mock-model"

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
- `resumo_tecnico` deve ter ao menos 2 frases completas e explicar os principais achados.
- `recomendacao` deve ter ao menos 1 frase completa, objetiva e acionavel.

Voce deve registrar o resultado usando a ferramenta `submit_analysis`.
Nao escreva explicacoes fora da ferramenta.
Estrutura obrigatoria:
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
    if MOCK_MODE:
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

            warning_message, _suggested = _build_loan_type_warning(
                selected_loan_type=loan_type,
                contract_text=extracted_text,
            )
            analysis.error_message = warning_message
            await db.commit()

            bcb_rate_data = await asyncio.wait_for(
                get_enriched_bcb_context(loan_type, force_refresh=not MOCK_MODE), timeout=20
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
            analysis.completed_at = datetime.utcnow()
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

            # 2. Busca taxas BCB AO VIVO + contexto STJ em paralelo
            # BCBAPIError e levantada se a API do BCB estiver indisponivel — nao existem fallbacks
            stj_ctx_data = {}
            try:
                stj_ctx_data_raw = await asyncio.wait_for(get_stj_context(loan_type), timeout=10)
                stj_ctx_data = stj_ctx_data_raw
            except Exception as stj_err:
                print(f"[analysis] STJ context nao disponivel (nao critico): {stj_err}")

            # BCB e CRITICO: sem taxa real nao fazemos analise
            try:
                bcb_ctx_data = await asyncio.wait_for(
                    get_enriched_bcb_context(loan_type, force_refresh=not MOCK_MODE), timeout=20
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

            bcb_prompt_ctx = format_bcb_context_for_prompt(bcb_ctx_data)
            stj_prompt_ctx = format_stj_context_for_prompt(stj_ctx_data) if stj_ctx_data else ""

            print(
                f"[analysis] BCB rate: {reference_rate}% a.m. "
                f"(serie {bcb_loan.get('bcb_serie')}, ref {bcb_loan.get('bcb_reference_date')}) "
                f"| STJ cases: {len(stj_ctx_data.get('leading_cases', []))}"
            )

            # 3. Analise Claude com contexto enriquecido
            started_at = perf_counter()
            ai_result, usage, selected_model = await analyze_contract(
                contract_text=extracted_text,
                loan_type=loan_type,
                reference_rate=reference_rate,
                image_pages=image_pages if image_pages else None,
                bcb_context=bcb_prompt_ctx,
                stj_context=stj_prompt_ctx,
            )
            duration_ms = int((perf_counter() - started_at) * 1000)
            input_tokens = int((usage or {}).get("input_tokens", 0) or 0)
            output_tokens = int((usage or {}).get("output_tokens", 0) or 0)

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

        except Exception as e:
            analysis.status = AnalysisStatus.FAILED
            analysis.error_message = _friendly_error_message(e)[:500]
            await db.commit()

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
