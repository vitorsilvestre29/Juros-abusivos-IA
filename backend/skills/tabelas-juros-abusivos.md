# Tabelas de Referência - Juros Abusivos

## Status de Validação Jurídica (v1)

- **VALIDADA**: uso como referência interna de triagem/risco.
- **REVISAR**: percentuais tratados como "limite legal" quando podem ser parâmetro de mercado/jurisprudência.
- **SUBSTITUIR**: nenhum trecho literal obrigatório; manter como guia técnico, não como citação normativa final.

> Uso correto: essas tabelas orientam o score de risco. A peça final deve citar norma/jurisprudência confirmada pelo advogado.

---

## Limites Máximos por Tipo de Operação (2024-2026)

### Empréstimo CLT (Desconto em Folha)

**Faixa de Referência (triagem interna)**: 3,0% a 4,5% a.m.
**Sinal de Abusividade (triagem)**: acima de 6% a.m.

| Faixa | CET Anual | Status |
|---|---|---|
| < 42% a.a. | Faixa comum de mercado | ✅ |
| 42% - 80% a.a. | Atenção (acima da média) | ⚠️ |
| > 80% a.a. | **ALTA SUSPEITA DE ABUSIVIDADE** | 🔴 |

### Empréstimo Bancário Direto (Crédito Pessoal)

**Faixa de Referência (triagem interna)**: 4% - 5% a.m.
**Sinal de Abusividade (triagem)**: acima de 7% a.m.

| Faixa | Taxa Mensal | CET Anual | Status |
|---|---|---|---|
| < 4% | Faixa comum de mercado | < 60% | ✅ |
| 4% - 5% | Mercado | 60% - 80% | ✅ |
| 5% - 7% | Caro | 80% - 120% | ⚠️ |
| > 7% | **ALTA SUSPEITA DE ABUSIVIDADE** | > 120% | 🔴 |

### Empréstimo CLT com Garantia

**Limite Recomendado**: 2% - 3% a.m.
**Limite de Abusividade**: Acima de 4% a.m.

### Crédito Habitacional

**Limite Recomendado**: 0,5% - 1% a.m.
**Limite de Abusividade**: Acima de 2% a.m.

### Empréstimo Área da Saúde

**Limite Recomendado**: 3% - 5% a.m.
**Limite de Abusividade**: Acima de 8% a.m.

---

## Componentes Abusivos Comuns

### 1. Seguro Prestamista (venda casada)
- **Percentual típico**: 1.5% - 3% do valor do empréstimo
- **Limite legal**: Deve ser opcional e discriminado
- **Abusivo**: Cobrado sem autorização expressa
- **Devolução**: 100% do prêmio + juros desde a contratação

### 2. IOF - Imposto sobre Operações Financeiras
- **Consignado**: Máx. 3% total (0,0082%/dia + 0,38%)
- **Pessoa Física**: Máx. 1,5%
- **Abusivo**: Cobrado acima do limite
- **Fundamento**: Decreto 6.306/2007

### 3. Tarifa de Cadastro
- **Limite legal**: Deve estar justificada
- **Abusivo**: Tarifa > 2% do valor do empréstimo
- **Fundamento**: CDC art. 51, IV

### 4. Taxa de Abertura de Crédito
- **Limite legal**: Não pode ser abusiva
- **Abusivo**: Acima de 3% do valor
- **Nota**: Muitos bancos cobram sem justificativa

---

## Cálculo Rápido de CET

**Fórmula simplificada:**
```
CET Mensal ≈ (Taxa Juros + Seguros + Taxas + IOF) / Parcelas
CET Anual ≈ ((1 + CET Mensal) ^ 12 - 1) × 100%
```

**Exemplo prático:**
- Valor: R$ 2.848,27
- Juros: 4,5% a.m. = 56% a.a.
- Seguro: 1,16% a.m. = 14,8% a.a.
- IOF: 1,0% = 1% a.a.
- **CET Total: ~58% + 15% + 1% = 74% a.a. (ABUSIVO se > 80%)**

---

## Red Flags por Banco (Histórico Interno - REVISAR periodicamente)

### FACTA Financeira
- 🔴 **Seguro não discriminado**: Comum
- 🔴 **CET > 80%**: Frequente
- 🔴 **Dados bancários incompletos**: Padrão
- **Recomendação**: Revisar toda cláusula de custos

### Itaú
- 🔴 **Tarifa de anuidade oculta**: Comum
- 🔴 **Proteção creditícia obrigatória**: Frequente
- ⚠️ **Taxa acima de mercado**: Ocasional
- **Recomendação**: Verificar se proteção foi autorizada

### Bradesco
- ⚠️ **Taxa acima de mercado**: Ocasional
- 🔴 **Venda casada (proteção)**: Frequente
- ⚠️ **Tarifa de serviço**: Comum
- **Recomendação**: Cuidado com serviços opcionais

### Banco do Brasil
- ⚠️ **Taxa moderada**: Geralmente OK
- ⚠️ **Seguro ocasional**: Menos comum que concorrentes
- ✅ **Documentação**: Melhor que média

---

## Método de Detecção Rápida (Triagem)

**Se QUALQUER uma dessas for verdade = ALTA SUSPEITA DE ABUSIVIDADE:**

1. CET > 80% a.a. (qualquer tipo de empréstimo)
2. Seguro cobrado sem assinatura específica
3. Taxa > 6% a.m. em CLT (desconto em folha)
4. Taxa > 7% a.m. em empréstimo bancário direto
5. Tarifa > 3% sem justificativa
6. Dados bancários incompletos (agência "0")
7. Contrato não discrimina custos claramente
8. Taxa mensal não menciona CET anual

---

## Comparativo de Mercado (Referência)

| Tipo | Média Mercado | Máximo Recomendado | Abusivo |
|---|---|---|---|
| CLT (desconto em folha) | 3,0% - 4,5% a.m. | 6% | > 6% |
| Bancário Direto (pessoal) | 4% - 5% a.m. | 7% | > 7% |
| Saúde | 4% - 5% a.m. | 8% | > 8% |
| Garantido | 2% - 3% a.m. | 4% | > 4% |
