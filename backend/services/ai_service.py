import anthropic
import os
import json
import re
from typing import Optional
from dotenv import load_dotenv
from fastapi.concurrency import run_in_threadpool

load_dotenv()

_client = None
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


# Preços por token (USD) — atualize se a Anthropic mudar
_PRICE_INPUT = {
    "claude-sonnet-4-6":        3.00 / 1_000_000,
    "claude-haiku-4-5-20251001": 0.80 / 1_000_000,
}
_PRICE_OUTPUT = {
    "claude-sonnet-4-6":        15.00 / 1_000_000,
    "claude-haiku-4-5-20251001":  4.00 / 1_000_000,
}


def _calc_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Retorna custo em USD para a chamada."""
    pi = _PRICE_INPUT.get(model, 3.00 / 1_000_000)
    po = _PRICE_OUTPUT.get(model, 15.00 / 1_000_000)
    return round(input_tokens * pi + output_tokens * po, 6)


async def _anthropic_create(**kwargs) -> tuple:
    """
    Executa chamada ao SDK fora do event loop.
    Retorna (response, cost_usd) — custo calculado com preços reais.
    """
    response = await run_in_threadpool(get_client().messages.create, **kwargs)
    model = kwargs.get("model", "")
    cost = _calc_cost(model, response.usage.input_tokens, response.usage.output_tokens)
    return response, cost

# ─────────────────────────────────────────────
# SYSTEM PROMPT APRIMORADO COM SKILLS INTEGRADAS
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """Você é um assistente jurídico sênior especializado em direito do consumidor bancário brasileiro,
atuando dentro do portal de um escritório de advocacia especializado em juros abusivos em empréstimos
CLT com desconto em folha, empréstimos bancários diretos (crédito pessoal) e ações na área da saúde.

Seu papel é guiar advogados passo a passo, de forma didática e segura, no processamento de cada caso.

═════════════════════════════════════════════════
TABELAS DE REFERÊNCIA — LIMITES MÁXIMOS (2024-2026)
═════════════════════════════════════════════════

EMPRÉSTIMO CLT (DESCONTO EM FOLHA):
- Faixa de referência: 3% a 4,5% a.m.
- Alerta de abusividade: acima de 6% a.m.
- CET anual muito elevado: alta suspeita de abusividade
- IOF: validar conforme modalidade e prazo no contrato

EMPRÉSTIMO BANCÁRIO DIRETO (CRÉDITO PESSOAL):
- Faixa de referência: 4% a 5% a.m.
- Alerta de abusividade: acima de 7% a.m.
- CET anual muito elevado: alta suspeita de abusividade
- IOF: validar conforme modalidade e prazo no contrato

EMPRÉSTIMO CLT COM GARANTIA:
- Limite Recomendado: 2% a 3% a.m.
- Limite de Abusividade: acima de 4% a.m.

CRÉDITO HABITACIONAL:
- Limite Recomendado: 0,5% a 1% a.m.
- Limite de Abusividade: acima de 2% a.m.

EMPRÉSTIMO ÁREA DA SAÚDE:
- Limite Recomendado: 3% a 5% a.m.
- Limite de Abusividade: acima de 8% a.m.

TABELA COMPARATIVA DE MERCADO:
| Tipo | Média Mercado | Máximo Recomendado | Abusivo |
|---|---|---|---|
| CLT (desconto em folha) | 3,0% - 4,5% a.m. | 6% | > 6% |
| Bancário Direto (pessoal) | 4% - 5% a.m. | 7% | > 7% |
| Saúde | 4% - 5% a.m. | 8% | > 8% |
| Garantido | 2% - 3% a.m. | 4% | > 4% |

═════════════════════════════════════════════════
JURISPRUDÊNCIA CONSOLIDADA STJ
═════════════════════════════════════════════════

REsp 1.061.530/RS (Tema 25) — CET ABUSIVO:
- Decisão: Taxa de juros acima de 2x a média de mercado é abusiva
- Frase-chave: "O Custo Efetivo Total superior ao dobro da taxa média praticada no mercado evidencia a natureza abusiva do contrato"
- Aplicação: Consignado acima de ~2,08% a.m. INSS; CLT acima de ~3-4% a.m.
- Fundamento: Art. 51, IV CDC; Súmula 382 STJ

REsp 1.063.488/RS — ANATOCISMO:
- Decisão: Capitalização mensal de juros é ilegal
- Aplicação: Juros sobre juros violam Lei 4.595/64
- Fundamento: Art. 4º Lei 4.595/64; CDC art. 6º
- Consequência: Devolução de valores capitalizados indevidamente

SÚMULA 382 STJ:
- "A capitalização de juros em cadeia é vedada"
- Aplica-se a operações de crédito pessoa física
- Não se aplica a operações com pessoa jurídica

REsp 1.629.320/SP (Tema 972) — SEGURO PRESTAMISTA COMPULSÓRIO:
- Decisão: Cobrar seguro sem autorização expressa é venda casada
- Penalidade: Devolução integral do prêmio + juros
- Prova requerida: Contrato deve conter assinatura específica autorizando o seguro
- Fundamento: Art. 39, VIII CDC (venda casada); Art. 39, X CDC (não informação clara)
- Jurisprudência consolidada: "Seguro não autorizado no termo deve ser devolvido"

RESOLUÇÃO BCB 4/2020 — DADOS INCOMPLETOS:
- Exigência: Identificação precisa da conta destinatária
- Violação: Dados bancários incompletos (agência "0", banco genérico)
- Consequência: Nulidade parcial da liberação; possível dano moral
- Prova: Contrato deve especificar exatamente a conta onde o crédito será depositado

DECRETO 6.306/2007 — IOF:
- Consignado: 0,0082% ao dia + 0,38% adicional (máximo total ~3%)
- Pessoa Física CLT: 1,5% máximo
- Saúde: Específico conforme tipo de operação
- Violação comum: Cobrar IOF acima do limite legal

═════════════════════════════════════════════════
MÉTODO DE DETECÇÃO RÁPIDA — CHECKLIST
═════════════════════════════════════════════════

SE QUALQUER UMA DESTAS FOR VERDADE = CONTRATO ABUSIVO:

✗ CET > 80% a.a. (qualquer tipo de empréstimo) = MANIFESTO
✗ Seguro cobrado sem assinatura específica = VENDA CASADA PRESUMIDA
✗ Taxa > 6% a.m. em CLT (desconto em folha) = ALTA SUSPEITA
✗ Taxa > 7% a.m. em bancário direto = ALTA SUSPEITA
✗ IOF incompatível com modalidade/prazo = VIOLAÇÃO REGULATÓRIA
✗ Tarifa > 3% sem justificativa = ABUSIVA
✗ Dados bancários incompletos (agência "0") = VIOLAÇÃO BCB 4/2020
✗ Contrato não discrimina custos claramente = FALTA TRANSPARÊNCIA (CDC 46)
✗ Taxa mensal não menciona CET anual = INFORMAÇÃO INCOMPLETA

ANÁLISE SISTEMÁTICA — 20 PONTOS:
1. Número do contrato / data de assinatura legível
2. Nome completo do cliente (não abreviado)
3. CPF completo com dígitos
4. RG com emissor
5. Data de nascimento DD/MM/AAAA
6. Endereço completo com CEP
7. Banco de destino (nome completo)
8. Agência (NUNCA "0")
9. Número da conta (com dígito verificador)
10. Tipo de conta explícito
11. Taxa mensal em % claro (ex: 4,5% a.m.)
12. CET anual fornecido
13. Seguro discriminado separadamente
14. Assinatura específica para seguro
15. Taxa de seguro mencionada
16. IOF discriminado separadamente
17. IOF dentro dos limites legais
18. Tarifas (cada uma com valor e justificativa)
19. Tabela de amortização consistente
20. Nenhuma cláusula que limite direitos do consumidor

═════════════════════════════════════════════════
PADRÕES DE ARGUMENTAÇÃO JURÍDICA
═════════════════════════════════════════════════

TESE 1 — CET ABUSIVO (> 80% a.a.):
Argumento: "O contrato apresenta CET anual de XX%, calculado como (juros YY% + seguros ZZ% + taxas AA% + IOF BB%) capitalizados mensalmente, superando em muito a prática de mercado. Para operações de [tipo de crédito], a taxa média de mercado é [X%], enquanto o contratado foi [Y%], configurando majoração abusiva."
Fundamento: CDC art. 51, IV; Súmula 382 STJ; REsp 1.061.530/RS
Pedido: "Declarar nula a cláusula de juros abusivos e condenar o banco a restituir, em valores corrigidos, a diferença entre o CET pago e o máximo permitido"

TESE 2 — VENDA CASADA (Seguro não autorizado):
Argumento: "O seguro prestamista, no valor de R$ XX,XX (YY% do empréstimo), foi incluído no contrato sem assinatura específica de autorização"
Fundamento: CDC art. 39, VIII; REsp 1.629.320/SP (Tema 972)
Pedido: "Declarar nula a contratação do seguro prestamista e condenar o banco a restituir integralmente o prêmio pago (R$ XX,XX) acrescido de juros de mora"

TESE 3 — ANATOCISMO:
Argumento: "O contrato prevê a 'capitalização mensal de juros', caracterizando o anatocismo vedado pela legislação bancária"
Fundamento: Lei 4.595/64 art. 4º; Súmula 382 STJ; REsp 1.063.488/RS
Pedido: "Declarar nulo o sistema de capitalização de juros e recalcular todas as parcelas usando juros simples"

TESE 4 — DADOS BANCÁRIOS INCOMPLETOS:
Argumento: "Os dados bancários constantes do contrato indicam agência '0' ou conta genérica, não identificando a conta específica"
Fundamento: CDC art. 46; Resolução BCB 4/2020 art. 46
Pedido: "Reconhecer a nulidade da cláusula e condenar por dano moral pela violação de direitos informativos"

TESE 5 — IOF EXCEDENTE:
Argumento: "O contrato cobrou IOF no valor de XX% ou R$ YY, superando o máximo legal estabelecido pelo Decreto 6.306/2007"
Fundamento: Decreto 6.306/2007; Lei 10.865/2004
Pedido: "Condenar o banco a restituir o IOF cobrado indevidamente, correspondente à diferença entre o IOF pago e o máximo legal"

TESE 6 — TARIFA ABUSIVA:
Argumento: "O contrato inclui tarifa de [tipo] no valor de R$ XX,XX, representando YY% do valor do empréstimo, sem justificativa legal"
Fundamento: CDC art. 51, IV; Jurisprudência consolidada (tarifa > 2-3% é presumida abusiva)
Pedido: "Declarar abusivas as cláusulas de tarifa e condenar o banco a restituir os valores cobrados indevidamente"

═════════════════════════════════════════════════
RESOLUÇÕES BCB VIGENTES (2024-2026)
═════════════════════════════════════════════════

RESOLUÇÃO BCB 4/2020 — Art. 46 (Identificação Precisa):
Exigência: Nome completo, CPF, RG, data nascimento, endereço, agência (nunca "0"), número conta com dígito, tipo conta
Violação Comum: Agência "0" ou conta genérica
Consequência Jurídica: Nulidade da cláusula + indenização por dano moral

RESOLUÇÃO BCB 55/2023 — Transparência em Operações:
Contrato deve conter: Taxa mensal em %, taxa anual, CET anual destacado, IOF (valor + %), tarifa cadastro (discriminada), taxa abertura (discriminada), tarifa anuidade (opcional), assinatura específica para cada seguro, tabela amortização completa
Sanção: Interpretação contra proferentem (favor do consumidor); presunção de abusividade

DECRETO 6.306/2007 — Alíquotas IOF:
Pessoa Física CLT: máximo 1,5%
Consignado: máximo 0,0082% ao dia + 0,38%
Microcrédito: máximo 2,38%
Violação: Restituição do IOF em excesso + juros de mora

CIRCULAR BCB 3.693/2013 — Limites de Taxa (recomendação, não lei):
Recomendações servem de referência para STJ determinar abusividade conforme REsp 1.061.530/RS

LEI 9.492/1997 — Direitos do Consumidor em Crédito:
- Receber cópia do contrato ANTES de assinar
- Solicitar cópia assinada a qualquer momento
- Ser informado de modificações com antecedência
- Modificação requer novo contrato ou aditivo assinado

═════════════════════════════════════════════════
CONHECIMENTO ESPECIALIZADO POR BANCO
═════════════════════════════════════════════════

FACTA FINANCEIRA:
- Principais: Seguro não discriminado (risco alto), CET > 80% (frequente), dados bancários incompletos (padrão)
- Red flag: Se seguro não está discriminado, presume-se venda casada
- Recomendação: Revisar toda cláusula de custos

ITAÚ:
- Principais: Tarifa de anuidade oculta (comum), proteção creditícia obrigatória (frequente), taxa acima de mercado (ocasional)
- Red flag: Proteção foi autorizada? Tarifa discriminada?
- Recomendação: Verificar se proteção foi autorizada

BRADESCO:
- Principais: Taxa acima de mercado (ocasional), venda casada de proteção (frequente), tarifa de serviço (comum)
- Red flag: Proteção é realmente opcional?
- Recomendação: Cuidado com serviços opcionais cobrados como obrigatórios

BANCO DO BRASIL:
- Taxa moderada: Geralmente OK
- Seguro ocasional: Menos comum que concorrentes
- Documentação: Melhor que a média
- Recomendação: Ainda verificar, mas risco menor

BANCO BRP:
- Cobranças de tarifa acima do mercado (geralmente o dobro do praticado)
- Seguro prestamista + tarifa combinados = dupla cobrança abusiva
- Taxa mensal costuma ultrapassar 6,5% — configura juros abusivos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESES JURÍDICAS DO ESCRITÓRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESE PRINCIPAL — JUROS ABUSIVOS:
"A taxa de juros praticada pelo requerido supera em mais de duas vezes a taxa média de mercado
divulgada pelo Banco Central para operações similares, configurando abusividade manifesta nos
termos da Súmula 566 do STJ e do art. 51 do CDC, sendo cabível a revisão contratual com
recálculo das parcelas pela taxa média de mercado e restituição do indébito."

TESE SEGURO PRESTAMISTA:
"O seguro prestamista foi incluído compulsoriamente sem autorização clara e destacada do
consumidor, vinculando sua contratação à obtenção do crédito, o que configura venda casada
vedada pelo art. 39, I do CDC e pelo REsp 1.639.320/SP do STJ. Requer-se a exclusão do
seguro do saldo devedor e restituição em dobro dos valores já pagos (art. 42 CDC)."

TESE RESTITUIÇÃO EM DOBRO:
"As cobranças indevidas foram realizadas de forma reiterada e consciente pela instituição
financeira, que detém pleno conhecimento das normas consumeristas, configurando dolo
presumido e autorizando a restituição em dobro prevista no art. 42, parágrafo único do CDC."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUXO DE TRABALHO OBRIGATÓRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. BOAS-VINDAS: Cumprimente e pergunte o tipo de caso (CLT desconto em folha / bancário direto / saúde)
2. CONTRATOS: Pergunte quantos contratos há e solicite o upload do PDF
3. ANÁLISE: Apresente as irregularidades encontradas de forma clara, explicando cada uma
4. DADOS DO CLIENTE: IMPORTANTE — nome, CPF, endereço, RG já foram extraídos automaticamente
   do contrato. NÃO peça esses dados novamente. Use os dados do CONTEXTO DO CASO.
5. CONFIRMAÇÃO: Confirme com o advogado se pode prosseguir para os documentos
6. DOCUMENTOS: Gere na ordem: Parecer Técnico → Procuração → Petição Inicial

GATE OBRIGATÓRIO ANTES DO RESULTADO FINAL:
- NUNCA conclua a análise final sem confirmar com o advogado:
  1) tipo de empréstimo (CLT desconto em folha ou bancário direto),
  2) banco/réu principal,
  3) objetivo da peça (parecer, revisão, petição, negociação).
- Se faltar qualquer informação, faça perguntas objetivas e curtas.
- Só apresente conclusão final após essa confirmação explícita.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE COMUNICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Use linguagem profissional mas acessível — explique termos jurídicos em português simples
- Ao apresentar irregularidades, sempre explique: O QUE é, POR QUE é ilegal, QUANTO vale
- Cite sempre o fundamento legal específico (artigo, súmula ou resolução)
- NUNCA peça dados que já estão no contexto (nome, CPF, RG, endereço)
- Quando um dado não estiver no contrato, aí sim pergunte ao advogado
- Seja objetivo nas respostas — o advogado está trabalhando, não quer textos longos sem necessidade
- Use emojis com moderação para facilitar leitura (✅ ⚠️ 🔴 📋)
- Ao detectar violação do checklist dos 8 pontos críticos, marque como MANIFESTO/PRESUMIDO
- Cite sempre o número exato do REsp ou Súmula STJ quando aplicável

Lembre-se: você está guiando um advogado. Seja preciso, didático, eficiente e altamente certeiro."""


# ─────────────────────────────────────────────
# DADOS MOCK PARA TESTE (não gasta tokens)
# ─────────────────────────────────────────────
MOCK_ANALYSIS = {
    "banco_identificado": "Facta Financeira S.A. [MODO TESTE]",
    "numero_contrato": "242222680014",
    "valor_emprestimo": "R$ 2.848,27",
    "taxa_mensal": "4,50% a.m.",
    "taxa_anual": "69,59% a.a.",
    "cet_mensal": "5,23% a.m.",
    "cet_anual": "85,97% a.a.",
    "numero_parcelas": "48",
    "valor_parcela": "R$ 606,63",
    "valor_total_devido": "R$ 29.118,24",
    "data_contrato": "04/12/2025",
    "dados_cliente": {
        "nome": "JOAO PAULO VIANA [TESTE]",
        "cpf": "374.624.468-47",
        "rg": "45704761",
        "data_nascimento": "23/11/1989",
        "estado_civil": "SEPARADO",
        "nacionalidade": "BRASILEIRA",
        "endereco": "RUA NAIR MOMESSO DA SILVEIRA, 180, RESIDENCIAL ESPLANADA DAS ZACARIAS, SP, 16207-110",
        "nome_mae": "ROSA MARIANO",
        "profissao": "CLT - DOURADINHO & GALANTE COMERCIO DE PNEUS"
    },
    "irregularidades": [
        {
            "tipo": "Seguro Prestamista Compulsório — Venda Casada",
            "descricao": "Seguro Prestamista de R$ 1.159,94 cobrado compulsoriamente, representando 40,7% do valor liberado. Não há evidência de autorização expressa do cliente.",
            "fundamento_legal": "Art. 39, I CDC; REsp 1.639.320/SP STJ (Tema 972)",
            "trecho_contrato": "Seguro Prestamista R$ 1.159,94",
            "valor_cobrado": "R$ 1.159,94",
            "gravidade": "alta"
        },
        {
            "tipo": "CET Abusivo — 85,97% ao ano",
            "descricao": "O Custo Efetivo Total de 85,97% ao ano é extremamente elevado, mais de duas vezes a média de mercado para crédito consignado (30% a 45% a.a.).",
            "fundamento_legal": "Súmula 566 STJ; Art. 51 CDC; REsp 1.061.530/RS (Tema 25)",
            "trecho_contrato": "CET a.m.: 5,23% / a.a.: 85,97%",
            "valor_cobrado": "Excesso de R$ 19.452,11 sobre o total financiado",
            "gravidade": "alta"
        },
        {
            "tipo": "Dados Bancários Incompletos na Liberação",
            "descricao": "Código do banco consta como '0' e agência em branco. Viola obrigatoriedade de identificação precisa da conta destinatária.",
            "fundamento_legal": "Resolução BCB 4/2020; Art. 46 CDC",
            "trecho_contrato": "Código do Banco: 0 / Agência: [branco]",
            "valor_cobrado": "R$ 2.848,27",
            "gravidade": "alta"
        }
    ],
    "resumo_para_cliente": "Seu contrato apresenta cobranças abusivas: seguro não autorizado de R$ 1.159,94 e juros totais de R$ 29.118,24 sobre um empréstimo de R$ 2.848,27.",
    "recomendacao": "Ação revisional com pedido de exclusão do seguro prestamista e recálculo dos juros pela taxa média de mercado, com restituição em dobro do indébito."
}

MOCK_CHAT_RESPONSE = """✅ [MODO TESTE — sem consumo de tokens]

Analisei o contrato. Encontrei **3 irregularidades graves**:

🔴 **Seguro Prestamista Compulsório** — R$ 1.159,94 cobrado sem autorização (venda casada, art. 39 CDC)
🔴 **CET de 85,97% ao ano** — mais que o dobro da média de mercado (Súmula 566 STJ)
🔴 **Dados bancários incompletos** — banco "0" e agência em branco (risco de fraude)

Posso prosseguir para gerar os documentos. Qual deseja primeiro: Parecer Técnico, Procuração ou Petição Inicial?"""


def extract_json_from_text(text: str) -> Optional[dict]:
    """Tenta extrair JSON de um texto de várias formas."""
    text = text.strip()

    # Tentativa 1: direto
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Tentativa 2: remove blocos markdown ```json ... ```
    match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Tentativa 3: remove ``` ... ```
    match = re.search(r'```\s*([\s\S]*?)\s*```', text)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Tentativa 4: encontra o maior bloco { ... } válido
    start = text.find('{')
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i+1])
                    except json.JSONDecodeError:
                        break

    return None


# ─────────────────────────────────────────────
# SYSTEM PROMPT COMPACTO — usado pelo Haiku no chat (menor custo)
# ─────────────────────────────────────────────
CHAT_SYSTEM_PROMPT = """Você é um assistente jurídico sênior especializado em direito do consumidor bancário brasileiro, atuando em um escritório de advocacia especializado em juros abusivos (consignado, CLT e saúde).

LIMITES DE ABUSIVIDADE (referência rápida):
- Consignado INSS: máximo 2,08% a.m. | CET > 80% a.a. = MANIFESTAMENTE ABUSIVO
- CLT: máximo 6% a.m. | CET > 100% a.a. = ABUSIVO
- Saúde: máximo 8% a.m.
- Seguro sem assinatura específica = VENDA CASADA (art. 39 CDC; REsp 1.629.320/SP)
- IOF consignado: máximo 0,0082%/dia + 0,38% | CLT: máximo 1,5%
- Dados bancários incompletos (agência "0") = VIOLAÇÃO BCB 4/2020

JURISPRUDÊNCIA-CHAVE:
- REsp 1.061.530/RS (Tema 25): taxa > 2x média mercado = abusiva
- Súmula 566 STJ: juros acima de 2x média = revisão obrigatória
- REsp 1.629.320/SP (Tema 972): seguro não autorizado = devolução integral
- Súmula 382 STJ: capitalização mensal vedada (anatocismo)
- Decreto 6.306/2007: limites de IOF

FLUXO:
1. Confirme tipo do caso (consignado/CLT/bancário direto/saúde)
2. Solicite PDF do contrato
3. Apresente análise das irregularidades com fundamento legal
4. NÃO peça dados que já estão no contexto do caso
5. Ofereça geração dos documentos (Parecer → Procuração → Petição)

REGRAS: linguagem profissional, cite artigos/súmulas exatos, use emojis com moderação (✅ ⚠️ 🔴 📋), seja objetivo."""


async def chat_with_ai(messages: list[dict], case_context: Optional[dict] = None) -> str:
    """Envia mensagens para o Claude Haiku (custo reduzido) e retorna a resposta."""
    if MOCK_MODE:
        return MOCK_CHAT_RESPONSE

    system = CHAT_SYSTEM_PROMPT
    if case_context:
        system += f"\n\nCONTEXTO DO CASO ATUAL:\n{json.dumps(case_context, ensure_ascii=False, indent=2)}"

    # Estratégia de contexto híbrida:
    # Sempre mantém as primeiras 6 mensagens (tipo do caso, análise do contrato)
    # + as últimas 24 mensagens (conversa recente)
    # Isso permite casos com 30-40+ mensagens sem perder o contexto essencial
    if len(messages) <= 30:
        recent_messages = messages
    else:
        head = messages[:6]   # contexto inicial do caso (boas-vindas, tipo, contrato)
        tail = messages[-24:] # conversa recente
        # Evita duplicatas se head e tail se sobrepõem
        head_ids = {id(m) for m in head}
        tail_dedup = [m for m in tail if id(m) not in head_ids]
        recent_messages = head + tail_dedup

    response, cost = await _anthropic_create(
        model="claude-haiku-4-5-20251001",  # ~70% mais barato que Sonnet para chat
        max_tokens=2048,
        system=system,
        messages=recent_messages
    )
    return response.content[0].text, cost


async def analyze_contract(contract_text: str, bank_name: str = "", image_pages: list = None) -> dict:
    """
    Analisa um contrato bancário e retorna as irregularidades encontradas.
    Se image_pages (lista de base64 PNG) for fornecida, usa visão para PDFs escaneados.
    """
    if MOCK_MODE:
        return MOCK_ANALYSIS, 0.0

    # Instrução precisa de extração de dados
    extraction_instruction = """
INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO:
1. Leia o documento INTEIRO antes de responder
2. Para dados do cliente: procure em QUALQUER parte do documento — cabeçalho, rodapé, tabelas, campos, formulários
3. CPF pode aparecer como "CPF:", "C.P.F.:", ou em formato XXX.XXX.XXX-XX
4. RG pode aparecer como "RG:", "R.G.:", "Identidade:", "Doc. Identidade:"
5. Endereço pode aparecer como "Endereço:", "Residência:", "End.:", "Logradouro:"
6. Banco pode aparecer no cabeçalho, logotipo (texto), CNPJ ou razão social
7. Se um campo não existir no documento, use "" (string vazia) — NUNCA invente dados
8. Analise as taxas com rigor: se CET > 80% a.a. é MANIFESTAMENTE ABUSIVO
9. Seguro sem assinatura específica = VENDA CASADA — cite o trecho exato
10. Dados bancários incompletos (agência "0", banco genérico) = VIOLAÇÃO BCB 4/2020
"""

    json_schema = """{
  "banco_identificado": "nome completo do banco (ex: Facta Financeira S.A.)",
  "numero_contrato": "número completo do contrato ou operação",
  "valor_emprestimo": "valor líquido liberado ao cliente (ex: R$ 2.848,27)",
  "taxa_mensal": "taxa de juros mensal (ex: 4,50% a.m.)",
  "taxa_anual": "taxa de juros anual (ex: 69,59% a.a.)",
  "cet_mensal": "Custo Efetivo Total mensal (ex: 5,23% a.m.)",
  "cet_anual": "Custo Efetivo Total anual (ex: 85,97% a.a.)",
  "numero_parcelas": "número total de parcelas (ex: 48)",
  "valor_parcela": "valor de cada parcela (ex: R$ 606,63)",
  "valor_total_devido": "total a pagar incluindo juros (ex: R$ 29.118,24)",
  "data_contrato": "data de assinatura (ex: 04/12/2025)",
  "dados_cliente": {
    "nome": "nome completo do contratante",
    "cpf": "CPF no formato XXX.XXX.XXX-XX",
    "rg": "número do RG completo",
    "data_nascimento": "data de nascimento DD/MM/AAAA",
    "estado_civil": "estado civil (solteiro, casado, etc)",
    "nacionalidade": "nacionalidade (ex: Brasileira)",
    "endereco": "endereço completo: rua, número, bairro, cidade, UF, CEP",
    "nome_mae": "nome da mãe",
    "profissao": "profissão ou vínculo empregatício"
  },
  "irregularidades": [
    {
      "tipo": "nome curto (ex: CET Abusivo)",
      "descricao": "descrição objetiva com os valores exatos do contrato",
      "fundamento_legal": "lei/súmula/resolução violada (ex: Art. 39 CDC; REsp 1.629.320/SP)",
      "trecho_contrato": "trecho EXATO copiado do documento que evidencia a irregularidade",
      "valor_cobrado": "valor em R$ da cobrança indevida (se identificável)",
      "gravidade": "alta ou media"
    }
  ],
  "resumo_para_cliente": "explicação em linguagem simples do problema",
  "recomendacao": "ação jurídica recomendada com fundamento legal"
}"""

    # Monta o conteúdo da mensagem (texto + imagens se disponíveis)
    content = []

    has_text = bool(contract_text and contract_text.strip() and len(contract_text.strip()) > 200)
    has_images = bool(image_pages)

    if has_text:
        # Para documentos com muitas páginas: envia até 60.000 chars
        # A maioria dos contratos de 13 páginas cabe nesse limite
        MAX_TEXT = 60000
        if len(contract_text) <= MAX_TEXT:
            text_block = contract_text
        else:
            # Pega início (primeiros 50.000) + final (últimos 8.000)
            # O início tem dados do cliente; o final tem assinaturas e totais
            text_block = (
                contract_text[:50000]
                + f"\n\n[... {len(contract_text) - 58000} caracteres intermediários omitidos ...]\n\n"
                + contract_text[-8000:]
            )

        content.append({
            "type": "text",
            "text": f"""Analise este documento jurídico/financeiro brasileiro e extraia todos os dados e irregularidades.

{extraction_instruction}

TEXTO EXTRAÍDO DO DOCUMENTO ({len(contract_text)} caracteres totais, {contract_text.count('--- Página') or '?'} páginas detectadas):
{text_block}

Retorne SOMENTE um objeto JSON válido com esta estrutura exata (sem markdown, sem explicações):
{json_schema}"""
        })

    if has_images:
        # PDFs escaneados/digitalizados: envia páginas como imagem
        # Claude aceita até 20 imagens por requisição
        MAX_IMG_PAGES = 20
        pages_to_send = image_pages[:MAX_IMG_PAGES]

        if not has_text:
            content.append({
                "type": "text",
                "text": f"""Analise as {len(pages_to_send)} imagens deste documento jurídico/financeiro brasileiro e extraia todos os dados e irregularidades.

{extraction_instruction}

Retorne SOMENTE um objeto JSON válido com esta estrutura exata (sem markdown, sem explicações):
{json_schema}"""
            })
        else:
            content.append({
                "type": "text",
                "text": f"Complementando com as {len(pages_to_send)} imagens do documento para capturar dados que o texto possa ter perdido:"
            })

        for img_b64 in pages_to_send:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": img_b64
                }
            })

    if not content:
        return {
            "banco_identificado": bank_name or "Não identificado",
            "dados_cliente": {},
            "irregularidades": [],
            "resumo_para_cliente": "Não foi possível ler o documento. Verifique se o PDF está correto.",
            "recomendacao": "Tente enviar o PDF novamente ou em outro formato."
        }, 0.0

    response, cost = await _anthropic_create(
        model="claude-sonnet-4-6",
        max_tokens=8096,  # Aumentado para documentos grandes com muitas irregularidades
        messages=[{"role": "user", "content": content}]
    )

    raw_text = response.content[0].text
    result = extract_json_from_text(raw_text)

    if result:
        return result, cost

    # Fallback seguro
    return {
        "banco_identificado": bank_name or "Identificação pendente",
        "numero_contrato": "",
        "valor_emprestimo": "",
        "taxa_mensal": "",
        "taxa_anual": "",
        "cet_anual": "",
        "dados_cliente": {},
        "irregularidades": [],
        "resumo_para_cliente": "Não foi possível extrair os dados automaticamente. Verifique o PDF.",
        "recomendacao": "Revisão manual recomendada",
        "_debug_raw": raw_text[:500]
    }, cost


async def generate_parecer_tecnico(case_data: dict, contracts_analysis: list[dict]) -> tuple:
    """Gera o texto do Parecer Técnico. Retorna (texto, cost_usd)."""
    if MOCK_MODE:
        return f"""PARECER TÉCNICO JURÍDICO [MODO TESTE]

CLIENTE: {case_data.get('client_name', 'N/I')} — CPF: {case_data.get('client_cpf', 'N/I')}

DOS FATOS
O cliente contratou empréstimo consignado junto à Facta Financeira S.A., verificando-se
cobranças abusivas de seguro prestamista (R$ 1.159,94) sem autorização e juros com CET
de 85,97% a.a., muito acima da média de mercado.

DO DIREITO
Configura-se venda casada (art. 39, I CDC) e juros abusivos (Súmula 566 STJ).

CONCLUSÃO
Recomenda-se ação revisional com restituição em dobro (art. 42 CDC).

[Cidade], {__import__('datetime').date.today().strftime('%d/%m/%Y')}
Advogado Responsável — OAB/XX 00000""", 0.0

    # Monta resumo das irregularidades para o prompt
    irregularidades_resumo = []
    for i, contrato in enumerate(contracts_analysis):
        banco = contrato.get("banco_identificado", "Banco não identificado")
        num_contrato = contrato.get("numero_contrato", "N/I")
        valor = contrato.get("valor_emprestimo", "N/I")
        taxa_m = contrato.get("taxa_mensal", "N/I")
        cet_a = contrato.get("cet_anual", contrato.get("taxa_anual", "N/I"))
        parcelas = contrato.get("numero_parcelas", "N/I")
        valor_parcela = contrato.get("valor_parcela", "N/I")
        total_devido = contrato.get("valor_total_devido", "N/I")
        data_contrato = contrato.get("data_contrato", "N/I")
        irrs = contrato.get("irregularidades", [])
        irregularidades_resumo.append(
            f"CONTRATO {i+1} — {banco}\n"
            f"  Nº: {num_contrato} | Data: {data_contrato}\n"
            f"  Valor liberado: {valor} | Taxa: {taxa_m} | CET anual: {cet_a}\n"
            f"  Parcelas: {parcelas}x de {valor_parcela} | Total devido: {total_devido}\n"
            f"  Irregularidades ({len(irrs)}):\n"
            + "\n".join(
                f"    [{j+1}] {irr.get('tipo','')} — {irr.get('descricao','')} "
                f"(Fundamento: {irr.get('fundamento_legal','')}) "
                f"[Valor: {irr.get('valor_cobrado','')}] "
                f"[Gravidade: {irr.get('gravidade','')}] "
                f"[Trecho: \"{irr.get('trecho_contrato','')}\"]"
                for j, irr in enumerate(irrs)
            )
        )

    prompt = f"""Você é um advogado sênior especialista em direito do consumidor bancário brasileiro.
Elabore um PARECER TÉCNICO JURÍDICO completo, formal e de alto nível profissional.

═══ DADOS DO CASO ═══
Cliente: {case_data.get('client_name', 'N/I')}
CPF: {case_data.get('client_cpf', 'N/I')}
Endereço: {case_data.get('client_address', 'N/I')}
Tipo de caso: {case_data.get('case_type', 'N/I')}

═══ ANÁLISE DOS CONTRATOS ═══
{chr(10).join(irregularidades_resumo)}

═══ ESTRUTURA OBRIGATÓRIA DO PARECER ═══

PARECER TÉCNICO JURÍDICO

I — IDENTIFICAÇÃO E QUALIFICAÇÃO DO CONTRATANTE
Parágrafo completo qualificando o cliente com todos os dados disponíveis (nome, CPF, endereço, tipo de vínculo).

II — OBJETO DO PARECER
Parágrafo explicando que este parecer analisa o(s) contrato(s) de crédito firmado(s) pelo cliente com a(s) instituição(ões) financeira(s) indicada(s), objetivando identificar eventuais ilegalidades e abusos.

III — DOS FATOS
Narrativa detalhada e cronológica: como o cliente contratou, quais os valores, as condições negociadas e o contexto do empréstimo. Mencione data do contrato, valor liberado, número de parcelas e valor das parcelas.

IV — DA ANÁLISE TÉCNICA DOS CONTRATOS
Para CADA irregularidade encontrada, redija um subcapítulo (IV.1, IV.2, IV.3...) contendo:
a) Título da irregularidade
b) Descrição detalhada com os valores exatos do contrato
c) Transcrição do trecho do contrato que evidencia a irregularidade (entre aspas)
d) Comparação com os parâmetros legais e de mercado (cite os índices do Banco Central)
e) Fundamento jurídico completo (artigos, súmulas, resoluções, acórdãos)
f) Valor do prejuízo ao consumidor

V — DO DIREITO APLICÁVEL
Seção consolidada com todos os fundamentos legais utilizados:
- Código de Defesa do Consumidor (Lei 8.078/1990): arts. 6º, 39, 42, 51, 52
- Súmula 566 STJ e REsp 1.061.530/RS (Tema 25) — juros abusivos
- REsp 1.629.320/SP (Tema 972) — venda casada / seguro prestamista
- Súmula 382 STJ — anatocismo
- Resolução BCB 4/2020 e BCB 55/2023 — transparência e dados
- Decreto 6.306/2007 — IOF
Cite o texto resumido de cada norma e sua aplicação ao caso concreto.

VI — DO CÁLCULO DOS DANOS E VALORES COBRADOS INDEVIDAMENTE
Tabela ou lista detalhada somando todos os valores cobrados abusivamente, com:
- Valor de cada irregularidade
- Total a restituir (simples e em dobro conforme art. 42 CDC)
- Valor da causa sugerido

VII — DA VIABILIDADE JURÍDICA DA AÇÃO
Parágrafo avaliando as chances de êxito da ação, os precedentes favoráveis e o posicionamento dos tribunais locais.

VIII — CONCLUSÃO E RECOMENDAÇÕES
Síntese das irregularidades, recomendação expressa de ajuizamento de ação revisional c/c restituição de indébito, e orientação sobre documentos necessários para a ação.

[Cidade/UF], {__import__('datetime').date.today().strftime('%d de %B de %Y')}

_______________________________________________
[Nome do Advogado Responsável]
OAB/[Estado] nº [Número]
Advogado Especialista em Direito Bancário e do Consumidor

═══ INSTRUÇÕES DE QUALIDADE ═══
- Use linguagem jurídica formal e técnica, com períodos completos
- Cite SEMPRE o número exato do acórdão, súmula ou artigo de lei
- Para cada irregularidade, transcreva O TRECHO EXATO do contrato entre aspas
- Calcule e mencione os valores com precisão — não use "valores a calcular"
- O parecer deve ter extensão compatível com um documento profissional (mínimo 800 palavras)
- NÃO use listas com bullet points simples — escreva em parágrafos estruturados
- Numere as seções conforme a estrutura acima (I, II, III...)"""

    response, cost = await _anthropic_create(
        model="claude-haiku-4-5-20251001",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text, cost


async def generate_peticao_inicial(case_data: dict, contracts_analysis: list[dict], parecer_text: str) -> tuple:
    """Gera o texto da Petição Inicial. Retorna (texto, cost_usd)."""
    if MOCK_MODE:
        return f"""EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO [MODO TESTE]

{case_data.get('client_name', 'CLIENTE')}, CPF {case_data.get('client_cpf', 'N/I')},
residente em {case_data.get('client_address', 'N/I')}, vem propor

AÇÃO REVISIONAL DE CONTRATO BANCÁRIO C/C RESTITUIÇÃO DE INDÉBITO

em face de FACTA FINANCEIRA S.A., pelos fatos e fundamentos a seguir.

DOS FATOS — Contratou empréstimo com cobranças abusivas...
DO DIREITO — Art. 39, I CDC; Súmula 566 STJ...
DOS PEDIDOS — Revisão de juros, exclusão do seguro, restituição em dobro...

Dá-se à causa o valor de R$ 29.118,24.
Termos em que pede deferimento.
[Cidade], {__import__('datetime').date.today().strftime('%d/%m/%Y')}""", 0.0

    # Monta resumo de irregularidades para petição
    reus = list(dict.fromkeys([c.get("banco_identificado", "Banco") for c in contracts_analysis]))
    todas_irrs = []
    valor_total_danos = 0.0
    for contrato in contracts_analysis:
        for irr in contrato.get("irregularidades", []):
            todas_irrs.append({
                "banco": contrato.get("banco_identificado", "Banco"),
                "contrato": contrato.get("numero_contrato", "N/I"),
                "tipo": irr.get("tipo", ""),
                "descricao": irr.get("descricao", ""),
                "fundamento": irr.get("fundamento_legal", ""),
                "trecho": irr.get("trecho_contrato", ""),
                "valor": irr.get("valor_cobrado", ""),
                "gravidade": irr.get("gravidade", ""),
            })

    dados_contratos = []
    for c in contracts_analysis:
        dados_contratos.append(
            f"- {c.get('banco_identificado','Banco')} | Contrato nº {c.get('numero_contrato','N/I')} | "
            f"Valor: {c.get('valor_emprestimo','N/I')} | Taxa: {c.get('taxa_mensal','N/I')} | "
            f"CET: {c.get('cet_anual',c.get('taxa_anual','N/I'))} | "
            f"Parcelas: {c.get('numero_parcelas','N/I')}x {c.get('valor_parcela','N/I')} | "
            f"Total: {c.get('valor_total_devido','N/I')}"
        )

    prompt = f"""Você é um advogado sênior especialista em direito do consumidor bancário brasileiro com ampla experiência em ações revisionais de contratos.
Elabore uma PETIÇÃO INICIAL completa, técnica e de alto nível para ação revisional de contrato bancário c/c repetição de indébito e danos morais.

═══ DADOS DO REQUERENTE ═══
Nome: {case_data.get('client_name', 'N/I')}
CPF: {case_data.get('client_cpf', 'N/I')}
Endereço: {case_data.get('client_address', 'N/I')}
Tipo de caso: {case_data.get('case_type', 'N/I')}

═══ DADOS DOS CONTRATOS ═══
{chr(10).join(dados_contratos)}

═══ IRREGULARIDADES IDENTIFICADAS ═══
{json.dumps(todas_irrs, ensure_ascii=False, indent=2)}

═══ ESTRUTURA OBRIGATÓRIA DA PETIÇÃO ═══

EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ª VARA CÍVEL DA COMARCA DE [COMARCA/UF]

[Nome do cliente], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG] e inscrito(a) no CPF sob o nº {case_data.get('client_cpf','N/I')}, residente e domiciliado(a) em {case_data.get('client_address','N/I')}, por meio de seu(sua) advogado(a) que esta subscreve (instrumento de mandato em anexo), vem, respeitosamente, à presença de Vossa Excelência, propor

AÇÃO REVISIONAL DE CONTRATO BANCÁRIO C/C REPETIÇÃO DE INDÉBITO E INDENIZAÇÃO POR DANOS MORAIS

em face de {' e '.join(reus)}, [QUALIFICAÇÃO DO RÉU: instituição financeira, CNPJ nº XXXXXXXXX, com sede em (cidade), pelos fatos e fundamentos de direito a seguir aduzidos]:

I — DOS FATOS
Narração detalhada e cronológica: como o cliente buscou o crédito, quais as condições apresentadas pelo banco, o que foi efetivamente contratado, como os valores foram descontados/cobrados, e quando o cliente percebeu as cobranças abusivas. Descreva cada contrato separadamente. Mencione datas, valores e contexto de vulnerabilidade do consumidor.

II — DO DIREITO

II.1 — DA RELAÇÃO DE CONSUMO E APLICAÇÃO DO CDC
Subseção explicando que a relação entre o banco e o cliente é tipicamente de consumo (art. 2º e 3º CDC), com aplicação integral do CDC e inversão do ônus da prova (art. 6º, VIII CDC).

II.2 — DOS JUROS ABUSIVOS E DO CET MANIFESTAMENTE ELEVADO
Para cada contrato com juros abusivos: transcreva a taxa do contrato, compare com a média do Banco Central para a modalidade, demonstre que supera em mais de duas vezes a média de mercado. Aplique:
- "A taxa de juros praticada pelo Requerido de [X]% ao mês (CET de [Y]% ao ano) supera em mais de duas vezes a taxa média de mercado divulgada pelo Banco Central para operações similares ([Z]% a.m.), configurando abusividade manifesta, nos termos da Súmula 566 do STJ e do art. 51, IV do Código de Defesa do Consumidor."
- Cite REsp 1.061.530/RS (Tema 25), Súmula 382 STJ, art. 51 CDC

II.3 — DA VENDA CASADA DO SEGURO PRESTAMISTA (se aplicável)
Se houver seguro não autorizado: transcreva o trecho do contrato que evidencia a cobrança, demonstre a ausência de assinatura específica autorizando o seguro, e aplique:
- "O seguro prestamista, no valor de R$ [X], foi incluído compulsoriamente no contrato sem que houvesse autorização clara, destacada e específica do Requerente, caracterizando venda casada vedada pelo art. 39, I do CDC, consoante o entendimento consolidado pelo STJ no julgamento do REsp 1.629.320/SP (Tema 972)."

II.4 — DO ANATOCISMO / CAPITALIZAÇÃO INDEVIDA (se aplicável)
Se houver capitalização: cite o trecho do contrato, aplique Súmula 382 STJ e REsp 1.063.488/RS.

II.5 — DO IOF ABUSIVO (se aplicável)
Se IOF exceder os limites: cite os valores, aplique Decreto 6.306/2007.

II.6 — DA VIOLAÇÃO AO DEVER DE TRANSPARÊNCIA E INFORMAÇÃO (se dados bancários incompletos)
Se agência "0" ou dados incompletos: cite Resolução BCB 4/2020, art. 46 CDC.

II.7 — DO DANO MORAL
Parágrafo argumentando que a inclusão de cobranças indevidas causa dano moral in re ipsa ao consumidor, configurando angústia, frustração e lesão à honra objetiva. Citar precedentes do STJ sobre dano moral em cobranças abusivas bancárias.

II.8 — DA RESTITUIÇÃO EM DOBRO
"As cobranças indevidas foram realizadas de forma reiterada e consciente pela instituição financeira, que detém pleno conhecimento das normas consumeristas, configurando dolo presumido e autorizando a restituição em dobro prevista no art. 42, parágrafo único do CDC." (Súmula 159 STJ)

III — DA TUTELA DE URGÊNCIA (ANTECIPAÇÃO DOS EFEITOS)
Requerer liminar para: suspensão imediata dos descontos/débitos, determinação de recálculo das parcelas pela taxa média de mercado, proibição de negativação em órgãos de proteção ao crédito. Aplicar art. 300 CPC — fumus boni iuris e periculum in mora.

IV — DOS PEDIDOS
Requerer expressamente (liste numerado de 1 a N):
1. Deferimento da tutela de urgência para suspender imediatamente os descontos/débitos até o trânsito em julgado
2. Declaração de nulidade das cláusulas abusivas referentes a juros (art. 51, IV CDC)
3. Revisão do contrato com recálculo de todas as parcelas pela taxa média de mercado do Banco Central para a modalidade
4. Restituição em dobro de todos os valores cobrados indevidamente (art. 42, § único CDC), incluindo: [liste cada item com valor]
5. Declaração de nulidade e exclusão do seguro prestamista (se aplicável), com devolução do prêmio pago em dobro
6. Condenação ao pagamento de indenização por danos morais no valor de R$ [sugerir valor entre R$ 5.000 e R$ 15.000 conforme gravidade]
7. Condenação ao pagamento de honorários advocatícios e custas processuais
8. Julgamento antecipado da lide (art. 355, I CPC) e produção de prova pericial contábil se necessário

V — DO VALOR DA CAUSA
Somar: valores a restituir em dobro + danos morais sugeridos. Declarar o valor total em R$.

VI — DOS REQUERIMENTOS FINAIS
- Inversão do ônus da prova (art. 6º, VIII CDC)
- Condenação em honorários sucumbenciais (art. 85 CPC)
- Citação do(s) réu(s) no endereço de sua sede
- Juntada de documentos: contrato(s), comprovantes de pagamento, procuração

Termos em que,
Pede deferimento.

[Cidade/UF], {__import__('datetime').date.today().strftime('%d de %B de %Y')}.

_______________________________________________
[Nome do Advogado]
OAB/[Estado] nº [Número]

═══ INSTRUÇÕES DE QUALIDADE ═══
- Use linguagem jurídica formal e técnica com períodos completos e bem estruturados
- Para CADA irregularidade, transcreva O TRECHO EXATO do contrato entre aspas
- Cite SEMPRE o número exato do acórdão, súmula ou artigo de lei
- Calcule valores precisos quando possível; use "a apurar em liquidação de sentença" quando não for possível
- A petição deve ter extensão profissional (mínimo 1.000 palavras de conteúdo jurídico)
- Deixe [COMARCA], [VARA], [RG] e dados do advogado entre colchetes para preenchimento posterior
- Omita as seções "se aplicável" que não tiverem correspondência nas irregularidades identificadas"""

    response, cost = await _anthropic_create(
        model="claude-haiku-4-5-20251001",
        max_tokens=10000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text, cost


async def generate_procuracao_text(case_data: dict) -> str:
    return f"Procuração Ad Judicia para {case_data.get('client_name', 'cliente')}."


async def analyze_contract_for_client(
    contract_text: str,
    loan_type: str,
    image_pages: list = None,
) -> dict:
    """
    Análise SIMPLIFICADA voltada ao cliente final (não ao advogado).
    Retorna apenas: has_issues (bool) + summary (frase curta).
    Não revela detalhes técnicos — só indica se há irregularidades.
    """
    if MOCK_MODE:
        return {"has_issues": True, "summary": "Identificamos cobranças indevidas no seu contrato."}

    loan_labels = {
        "clt": "empréstimo consignado CLT (desconto em folha)",
        "bancario_direto": "empréstimo bancário direto (crédito pessoal)",
        "saude": "contrato de plano de saúde",
    }
    loan_label = loan_labels.get(loan_type, "contrato financeiro")

    system = (
        "Você é um analisador jurídico especializado em direito do consumidor bancário brasileiro. "
        "Analise o contrato fornecido e determine objetivamente se existem irregularidades como: "
        "juros acima da média de mercado, tarifas indevidas, seguros embutidos sem autorização, "
        "CET elevado, ou cláusulas abusivas conforme CDC e regulamentações do Banco Central. "
        "Responda SOMENTE em JSON, sem markdown, sem texto extra."
    )

    user_content: list = []

    if image_pages:
        for b64 in image_pages[:6]:  # máximo 6 páginas
            user_content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": b64},
            })
        user_content.append({
            "type": "text",
            "text": (
                f"Analise este {loan_label} e responda em JSON com:\n"
                '{"has_issues": true/false, "summary": "uma frase curta sobre a conclusão"}\n'
                "has_issues=true se encontrar QUALQUER irregularidade. "
                "Se has_issues=true, summary deve dizer algo como: "
                '"Identificamos cobranças indevidas no seu contrato." '
                "Se has_issues=false, summary deve dizer: "
                '"Seu contrato não apresentou irregularidades evidentes." '
                "Não inclua detalhes técnicos no summary."
            ),
        })
    else:
        user_content.append({
            "type": "text",
            "text": (
                f"Analise este {loan_label}:\n\n{contract_text[:15000]}\n\n"
                "Responda em JSON:\n"
                '{"has_issues": true/false, "summary": "uma frase curta"}\n'
                "has_issues=true se encontrar QUALQUER irregularidade. "
                'Se true: summary = "Identificamos cobranças indevidas no seu contrato." '
                'Se false: summary = "Seu contrato não apresentou irregularidades evidentes." '
                "Não inclua detalhes técnicos."
            ),
        })

    response, _cost = await _anthropic_create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )

    import json as _json
    raw = response.content[0].text.strip()
    try:
        result = _json.loads(raw)
        return {
            "has_issues": bool(result.get("has_issues", False)),
            "summary": str(result.get("summary", "")),
        }
    except Exception:
        has = "irregularidades" in raw.lower() or "abusiv" in raw.lower() or '"has_issues": true' in raw
        return {
            "has_issues": has,
            "summary": "Identificamos cobranças indevidas no seu contrato." if has
                       else "Seu contrato não apresentou irregularidades evidentes.",
        }


async def search_jurisprudencia(tema: str, tribunais: list[str] = None) -> str:
    if MOCK_MODE:
        return "Jurisprudência mock: Súmula 566 STJ, REsp 1.639.320/SP, Súmula 381 STJ [MODO TESTE]"

    if not tribunais:
        tribunais = ["STJ", "STF", "TST"]

    prompt = f"""Liste a jurisprudência mais relevante dos tribunais {', '.join(tribunais)} sobre: {tema}
Foque em: juros abusivos consignado, venda casada seguros, revisão contratos bancários, restituição dobro CDC.
Liste pelo menos 5 precedentes com tribunal, número e ementa resumida."""

    response = await _anthropic_create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
