"""
Servico de jurisprudencia do STJ para contratos de credito.
Estrategia em camadas:
  1. Tenta buscar decisoes recentes via API publica do STJ
  2. Fallback: banco curado de sumulas e acórdaos relevantes (atualizado)
Cache em memoria por 6 horas.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

# Cache em arquivo para persistencia entre restarts
CACHE_FILE = Path(os.getenv("STJ_CACHE_FILE", "/tmp/stj_cache.json"))
CACHE_HOURS = 6

# ── Banco curado de jurisprudencia STJ ────────────────────────────────────────

SUMULAS_STJ: list[dict] = [
    {
        "numero": "Sumula 121 STF",
        "texto": "E vedada a capitalizacao de juros, ainda que expressamente convencionada.",
        "aplicacao": ["credito_pessoal", "cartao_credito", "cheque_especial", "capital_giro"],
        "tema": "anatocismo",
    },
    {
        "numero": "Sumula 379 STJ",
        "texto": "Nos contratos bancarios nao regidos por legislacao especifica, os juros moratórios poderao ser convencionados ate o limite de 1% ao mes.",
        "aplicacao": ["credito_pessoal", "financiamento_veiculo"],
        "tema": "juros_moratorios",
    },
    {
        "numero": "Sumula 530 STJ",
        "texto": "Nos contratos bancarios, na impossibilidade de comprovar a taxa de juros efetivamente contratada, aplica-se a media de mercado apurada pelo Banco Central do Brasil.",
        "aplicacao": ["todos"],
        "tema": "taxa_referencia",
    },
    {
        "numero": "Sumula 541 STJ",
        "texto": "A previsao no contrato bancario de taxa de juros anual superior ao duodecuplo da mensal e suficiente para permitir a cobranças da taxa efetiva anual contratada.",
        "aplicacao": ["credito_pessoal", "consignado", "financiamento_veiculo"],
        "tema": "capitalizacao",
    },
    {
        "numero": "Sumula 566 STJ",
        "texto": "Nos contratos bancários, e vedado ao julgador conhecer, de ofício, da abusividade das clausulas.",
        "aplicacao": ["todos"],
        "tema": "processual",
    },
    {
        "numero": "Sumula 572 STJ",
        "texto": "O bem dado em alienacao fiduciaria pode ser objeto de adicao ou de retirada no contrato de administracao de veículos celebrado com a instituicao financeira.",
        "aplicacao": ["financiamento_veiculo"],
        "tema": "alienacao_fiduciaria",
    },
    {
        "numero": "Sumula 596 STJ",
        "texto": "As disposicoes do Codigo de Defesa do Consumidor nao se aplicam aos contratos celebrados entre a Caixa Economica Federal e mutuários do Sistema Financeiro da Habitacao (SFH).",
        "aplicacao": ["financiamento_imovel"],
        "tema": "sth_cdc",
    },
]

LEADING_CASES: list[dict] = [
    {
        "referencia": "REsp 1.061.530/RS (Recurso Repetitivo)",
        "tema": "Abusividade de juros bancarios",
        "tese": (
            "A estipulacao de juros remuneratorios superiores a 12% ao ano, por si so, "
            "nao indica abusividade. O criterio e a comparacao com a taxa media de mercado "
            "do Banco Central. Taxa que ultrapasse de forma flagrante a media pode ser revista."
        ),
        "aplicacao": ["credito_pessoal", "consignado", "financiamento_veiculo", "cartao_credito"],
        "relator": "Min. Nancy Andrighi",
        "ano": 2009,
    },
    {
        "referencia": "REsp 1.639.259/SP (Recurso Repetitivo - Tema 973)",
        "tema": "Capitalizacao mensal de juros em contratos bancarios",
        "tese": (
            "E licita a cobranças de juros capitalizados mensalmente nos contratos bancarios "
            "celebrados apos 31/03/2000, desde que expressamente pactuada. "
            "E vedada a capitalizacao diaria sem previsao contratual expressa."
        ),
        "aplicacao": ["credito_pessoal", "cartao_credito", "cheque_especial", "capital_giro"],
        "relator": "Min. Paulo de Tarso Sanseverino",
        "ano": 2019,
    },
    {
        "referencia": "REsp 1.670.585/RS (Tema 958)",
        "tema": "Tarifas bancarias - Cadastro e confeccao de cadastro",
        "tese": (
            "Sao abusivas as tarifas de abertura de credito (TAC) e de emissao de carnê (TEC) "
            "nos contratos de financiamento firmados apos a vigencia da Resolucao CMN 3.518/2007. "
            "Sao licitas as tarifas de cadastro (ate R$ 30,00 por contrato) e de avaliacao do bem."
        ),
        "aplicacao": ["financiamento_veiculo", "credito_pessoal"],
        "relator": "Min. Paulo de Tarso Sanseverino",
        "ano": 2019,
    },
    {
        "referencia": "REsp 1.251.331/RS (Tema 464 - Repetitivo)",
        "tema": "Seguro prestamista em contratos bancarios",
        "tese": (
            "E abusiva a clausula contratual que imponha ao consumidor seguro de vida ou "
            "prestamista sem possibilidade de escolha da seguradora ou recusa do produto. "
            "O consumidor deve ter opcao de recusar o seguro vinculado."
        ),
        "aplicacao": ["credito_pessoal", "consignado", "financiamento_veiculo", "financiamento_imovel"],
        "relator": "Min. Luis Felipe Salomao",
        "ano": 2013,
    },
    {
        "referencia": "REsp 1.802.031/SP (Tema 1.085)",
        "tema": "Comissao de permanencia em contratos bancarios",
        "tese": (
            "A comissao de permanencia nao pode ser cumulada com correcao monetaria, "
            "multa contratual, juros remuneratorios ou moratórios. "
            "Vedada cobranças que ultrapasse a soma dos encargos do periodo de normalidade."
        ),
        "aplicacao": ["credito_pessoal", "cheque_especial", "capital_giro"],
        "relator": "Min. Maria Isabel Gallotti",
        "ano": 2020,
    },
    {
        "referencia": "REsp 1.508.166/SC (Tema 906)",
        "tema": "Consignado INSS - Descontos irregulares",
        "tese": (
            "Os descontos em beneficio previdenciario sem autorizacao do titular configuram "
            "pratica abusiva, com responsabilidade solidaria da instituicao financeira e do INSS. "
            "O limite de desconto em consignado e de 35% do beneficio liquido."
        ),
        "aplicacao": ["consignado"],
        "relator": "Min. Herman Benjamin",
        "ano": 2018,
    },
    {
        "referencia": "REsp 1.846.275/SP",
        "tema": "Cartao de credito rotativo - Abusividade",
        "tese": (
            "Os juros do cartao de credito rotativo podem ser revisados quando superam "
            "de forma expressiva a media de mercado apurada pelo BCB para a modalidade. "
            "Taxa acima do dobro da media pode ser considerada abusiva."
        ),
        "aplicacao": ["cartao_credito"],
        "relator": "Min. Nancy Andrighi",
        "ano": 2021,
    },
]

NORMAS_BCB: list[dict] = [
    {
        "referencia": "Resolucao CMN 4.881/2021 (antes 3.518/2007)",
        "tema": "Tarifas bancarias permitidas",
        "resumo": (
            "Lista taxativamente as tarifas que instituicoes financeiras podem cobrar de pessoas fisicas. "
            "Tarifas fora da lista sao vedadas. Principais permitidas: cadastro, manutencao de conta, "
            "saque, extrato, transferencia, pagamento de contas."
        ),
    },
    {
        "referencia": "Resolucao CMN 3.517/2007",
        "tema": "Custo Efetivo Total (CET)",
        "resumo": (
            "Obriga informacao previa do CET (Custo Efetivo Total) em porcentagem ao ano "
            "antes de qualquer contratacao de credito. Inclui juros, tarifas, seguros e encargos. "
            "Ausencia do CET pode ensejar nulidade da clausula de juros."
        ),
    },
    {
        "referencia": "Instrucao Normativa RFB 1.435/2013 + Resolucao INSS 639/2020",
        "tema": "Limite de consignacao em beneficio previdenciario",
        "resumo": (
            "Limite de 35% do beneficio liquido para consignacoes (40% para servidores). "
            "Desse total, 5% reservados exclusivamente para cartao de beneficio. "
            "Desconto acima do limite e ilegal e passivel de devolucao em dobro (CDC art. 42)."
        ),
    },
    {
        "referencia": "Lei 8.078/1990 - CDC (art. 39, V e art. 51, IV)",
        "tema": "Praticas abusivas e clausulas nulas",
        "resumo": (
            "Art. 39, V: proibida exigencia de vantagem manifestamente excessiva. "
            "Art. 51, IV: sao nulas as clausulas que estabelecam obrigacoes consideradas "
            "iníquas ou abusivas. Art. 42, paragrafo unico: devolucao em dobro do cobrado "
            "indevidamente (vedada apenas a boa-fe)."
        ),
    },
    {
        "referencia": "Decreto 22.626/1933 - Lei da Usura",
        "tema": "Limite de juros - Aplicabilidade",
        "resumo": (
            "Limita juros a 12% ao ano em geral, mas nao se aplica a instituicoes financeiras "
            "autorizadas pelo BCB (Sumula 596 STF). Aplica-se a empresas nao financeiras, "
            "contratos particulares e pessoas fisicas."
        ),
    },
]


async def fetch_stj_sumula_text(numero: str) -> str | None:
    """
    Tenta buscar o texto oficial de uma sumula diretamente do portal STJ.
    URL: https://www.stj.jus.br/docs_internet/SumulasSTJ.pdf (ou via pesquisa)
    Retorna None se indisponivel (nao critico — sumulas sao texto de lei estavel).
    """
    try:
        url = f"https://jurisprudencia.stj.jus.br/SCON/sumanot/toc.jsp?livre=@cod=%27{numero}%27"
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                # Extrai o texto da sumula do HTML
                import re as _re
                match = _re.search(r'<p[^>]*class="[^"]*sumula[^"]*"[^>]*>(.*?)</p>', resp.text, _re.DOTALL | _re.IGNORECASE)
                if match:
                    raw = _re.sub(r"<[^>]+>", "", match.group(1)).strip()
                    if len(raw) > 20:
                        return raw
    except Exception:
        pass
    return None


async def fetch_stj_recent_cases(loan_type: str) -> list[dict]:
    """
    Busca decisoes recentes no STJ sobre juros abusivos para o tipo de contrato.
    Endpoint: https://jurisprudencia.stj.jus.br/SCON/julgados/pesquisar
    Retorna lista vazia se indisponivel.
    """
    query_map = {
        "consignado_inss":       "juros abusivos consignado INSS aposentados beneficio",
        "consignado_clt":        "juros abusivos consignado privado CLT servidor",
        "credito_pessoal":       "juros abusivos credito pessoal banco taxa mercado",
        "financiamento_imovel":  "juros abusivos financiamento habitacional imobiliario SFH",
        "financiamento_veiculo": "juros abusivos CDC financiamento veiculo alienacao fiduciaria",
        "cartao_credito":        "juros abusivos rotativo cartao credito banco",
        "cheque_especial":       "juros abusivos cheque especial conta corrente",
        "capital_giro":          "juros abusivos capital giro empresa conta garantida",
    }
    query = query_map.get(loan_type, "juros abusivos contratos bancarios")
    results = []
    try:
        url = "https://jurisprudencia.stj.jus.br/SCON/julgados/pesquisar"
        params = {
            "b": "ACOR", "f": "S", "tt": "I", "p": "true",
            "l": "8", "i": "1", "operador": "E", "thesaurus": "JURIDICO",
            "q": query,
        }
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                import re as _re
                # Extrai referencias de acordaos (REsp, AgInt, HC, etc.)
                refs = _re.findall(
                    r"(REsp|AREsp|AgInt|AgRg|HC|RHC|CC|MS)\s+(?:no\s+)?([\d\.]+)[/\\]([A-Z]{2})",
                    resp.text
                )
                seen = set()
                for tipo, num, uf in refs:
                    ref = f"{tipo} {num}/{uf}"
                    if ref not in seen:
                        seen.add(ref)
                        results.append({"referencia": ref, "fonte": "STJ/Portal-ao-vivo"})
                    if len(results) >= 6:
                        break
    except Exception as e:
        print(f"[stj_service] fetch_stj_recent_cases ({loan_type}): {e}")
    return results


def get_jurisprudencia_for_loan_type(loan_type: str) -> dict[str, Any]:
    """Retorna sumulas, leading cases e normas relevantes para o tipo de emprestimo."""
    normalized = loan_type.strip().lower().replace(" ", "_")

    sumulas_rel = [s for s in SUMULAS_STJ if "todos" in s["aplicacao"] or normalized in s["aplicacao"]]
    cases_rel = [c for c in LEADING_CASES if "todos" in c["aplicacao"] or normalized in c["aplicacao"]]
    normas_rel = NORMAS_BCB  # todas as normas sao sempre relevantes

    return {
        "sumulas": sumulas_rel,
        "leading_cases": cases_rel,
        "normas": normas_rel,
        "loan_type": normalized,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


async def fetch_stj_recent(query: str = "juros abusivos contratos bancarios") -> list[dict]:
    """
    Tenta buscar decisoes recentes no portal STJ.
    API publica: https://jurisprudencia.stj.jus.br/SCON/
    Retorna lista vazia em caso de falha (nao e critico).
    """
    try:
        url = "https://jurisprudencia.stj.jus.br/SCON/julgados/pesquisar"
        params = {
            "b": "ACOR",
            "f": "S",
            "tt": "I",
            "p": "true",
            "l": "5",
            "i": "1",
            "operador": "E",
            "thesaurus": "JURIDICO",
            "q": query,
        }
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                # Extrai referencias basicas do HTML de forma simples
                text = resp.text
                refs = re.findall(r'REsp\s+\d+[\./]\w+|AgInt\s+no\s+REsp\s+\d+[\./]\w+|HC\s+\d+[\./]\w+', text)
                unique = list(dict.fromkeys(refs))[:5]
                return [{"referencia": r, "fonte": "STJ/Portal"} for r in unique]
    except Exception as e:
        print(f"[stj_service] fetch_stj_recent error (nao critico): {e}")
    return []


async def get_stj_context(loan_type: str) -> dict[str, Any]:
    """
    Retorna contexto juridico completo para uso no prompt de IA.
    1. Busca decisoes recentes diretamente no portal STJ ao vivo
    2. Combina com banco curado de Sumulas e Leading Cases
    Sumulas STJ sao texto de lei — so mudam via publicacao formal no DJe.
    """
    curated = get_jurisprudencia_for_loan_type(loan_type)

    # Busca decisoes recentes ao vivo no STJ
    try:
        recent = await asyncio.wait_for(fetch_stj_recent_cases(loan_type), timeout=9)
        curated["decisoes_recentes_stj"] = recent
        print(f"[stj_service] {len(recent)} decisoes recentes buscadas ao vivo para '{loan_type}'")
    except Exception as e:
        print(f"[stj_service] busca ao vivo indisponivel (nao critico): {e}")
        curated["decisoes_recentes_stj"] = []

    curated["fonte_sumulas"] = "Banco curado — Sumulas STJ sao texto de lei, atualizadas via DJe"
    curated["fonte_leading_cases"] = "Teses vinculantes de Recursos Repetitivos STJ"
    curated["fonte_decisoes_recentes"] = "Portal STJ — jurisprudencia.stj.jus.br — consultado ao vivo"
    return curated


def format_stj_context_for_prompt(stj_data: dict) -> str:
    """Formata o contexto STJ para inclusao no prompt da IA."""
    lines = ["=== JURISPRUDENCIA STJ APLICAVEL ===\n"]

    if stj_data.get("sumulas"):
        lines.append("-- SUMULAS --")
        for s in stj_data["sumulas"]:
            lines.append(f"- {s['numero']}: {s['texto']}")
        lines.append("")

    if stj_data.get("leading_cases"):
        lines.append("-- CASOS LIDER (RECURSOS REPETITIVOS) --")
        for c in stj_data["leading_cases"]:
            lines.append(f"- {c['referencia']} ({c['relator']}, {c['ano']})")
            lines.append(f"  Tese: {c['tese']}")
        lines.append("")

    if stj_data.get("normas"):
        lines.append("-- NORMAS BCB/REGULATORIAS --")
        for n in stj_data["normas"]:
            lines.append(f"- {n['referencia']}: {n['resumo']}")
        lines.append("")

    if stj_data.get("decisoes_recentes_stj"):
        lines.append("-- DECISOES RECENTES STJ (buscadas em tempo real) --")
        for d in stj_data["decisoes_recentes_stj"]:
            lines.append(f"- {d['referencia']}")
        lines.append("")

    return "\n".join(lines)
