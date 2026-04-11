# Checklist Sistemático - Análise de Contrato de Crédito

## Status de Validação Jurídica (v1)

- **VALIDADA**: estrutura operacional de auditoria (20 pontos + 5 críticos).
- **REVISAR**: itens que tratam percentuais como limite legal fixo sem confirmação normativa no caso concreto.
- **SUBSTITUIR**: referência direta de súmula/dispositivo quando não houver conferência textual.

> Uso recomendado: checklist para triagem técnica. Fundamentação final da peça sempre validada por humano.

---

## Propósito
Framework de 20 pontos para verificação metódica de contratos de empréstimo, garantindo cobertura completa de irregularidades comuns em operações CLT (desconto em folha), bancário direto (crédito pessoal) e área de saúde.

---

## Identificação Básica do Contrato

### 1. Dados da Operação
- [ ] Número do contrato/operação presente e legível
- [ ] Data de assinatura claramente especificada (não em branco)
- [ ] Tipo de operação explicitamente denominado (CLT desconto em folha, bancário direto/pessoal, saúde)
- [ ] Instituição financeira identificada com CNPJ

### 2. Identificação do Cliente
- [ ] Nome completo presente (não abreviado ou "cliente")
- [ ] CPF completo com dígitos verificadores
- [ ] RG ou documento identificação com emissor
- [ ] Data de nascimento no formato DD/MM/AAAA
- [ ] Estado civil declarado
- [ ] Endereço completo (rua, número, complemento, bairro, cidade, CEP)
- [ ] Telefone e email funcionais

### 3. Identificação da Conta Destinatária
- [ ] Banco de destino (nome completo, não abreviado)
- [ ] Número da agência (nunca "0")
- [ ] Número da conta (completo com dígito verificador)
- [ ] Tipo de conta (corrente/poupança) explicitamente indicado

---

## Análise de Taxas e Custos

### 4. Taxa de Juros
- [ ] Taxa mensal em percentual claro (ex: 4,5% a.m., não "4.5")
- [ ] Taxa anual ou CET anual fornecido(a) no contrato
- [ ] Para CLT (desconto em folha): atenção se taxa > 6% a.m. (triagem interna)
- [ ] Para bancário direto (crédito pessoal): atenção se taxa > 7% a.m. (triagem interna)
- [ ] Cálculo CET anual: verificar se = (juros + seguros + taxas + IOF)^12 - 1
- [ ] Se CET > 80% a.a.: SINALIZA ABUSIVIDADE MANIFESTA

### 5. Seguro Prestamista (Venda Casada)
- [ ] Seguro está explicitamente discriminado como ítem separado
- [ ] Assinatura específica para autorização de seguro (não genérica)
- [ ] Taxa ou valor do seguro mencionado (nunca oculto em "CET")
- [ ] Se seguro não tem assinatura específica: VENDA CASADA PRESUMIDA
- [ ] Seguro não pode ser condicionante de aprovação do crédito

### 6. IOF (Imposto sobre Operações Financeiras)
- [ ] IOF está discriminado separadamente
- [ ] IOF está claramente discriminado e separado das demais tarifas
- [ ] IOF foi calculado conforme tipo de operação e prazo contratual
- [ ] Se houver indício de IOF acima do permitido: marcar para validação jurídica específica

### 7. Taxas Administrativas
- [ ] Tarifa de cadastro (se existe): valor ≤ 2% do empréstimo
- [ ] Taxa de abertura de crédito (se existe): valor ≤ 3% do empréstimo
- [ ] Tarifa de anuidade: deve ser opcional e discriminada
- [ ] Cada taxa tem justificativa ou fundamento legal

---

## Validação de Conformidade Legal

### 8. Cláusulas Abusivas (CDC Art. 51)
- [ ] Contrato não limita direitos do consumidor sem reciprocidade
- [ ] Não há renúncia de direitos do consumidor (nulidade automática)
- [ ] Não há condicionalidades abusivas (ex: compra casada de produtos)
- [ ] Não há inversão de ônus da prova desfavorável ao consumidor

### 9. Transparência e Informação (CDC Art. 46)
- [ ] Contrato está em linguagem clara, legível (não pequena demais)
- [ ] Não há cláusulas contraditórias entre seções
- [ ] Tabela de amortização presente e numericamente consistente
- [ ] Valor da primeira parcela corresponde ao cálculo apresentado

### 10. Capitalização de Juros (REVISAR fundamento jurisprudencial)
- [ ] Contrato não menciona "juros capitalizados mensalmente"
- [ ] Não há indicação de anatocismo (juros sobre juros)
- [ ] Sistema de cálculo descrito como "juros simples" ou "linear"

---

## Dados de Origem e Emprego

### 11. Dados Profissionais/Ocupacionais
- [ ] Profissão do cliente mencionada (não em branco)
- [ ] Se CLT desconto em folha: nome do empregador e vínculo trabalhista
- [ ] Se bancário direto: modalidade do crédito e canal de contratação (app, agência, correspondente)
- [ ] Fonte de renda confirmada (folha de pagamento, contracheque)

### 12. Verificação de Garantias (se houver)
- [ ] Tipo de garantia explicitado (pessoal, imóvel, veículo)
- [ ] Valor da garantia equipara-se ao empréstimo
- [ ] Não há garantia abusiva desproporcional
- [ ] Se com garantia: taxa deve ser ≤ 4% a.m. (CLT)

---

## Procedimento de Teste Rápido

### Checklist Acelerado (5 Pontos Críticos)

Se QUALQUER um destes falhar → Contrato tem VÍCIO:

1. **CET > 80% a.a.** (Alta suspeita de abusividade)
2. **Seguro SEM assinatura específica** (Venda Casada)
3. **Agência = "0" ou conta incompleta** (Violação BCB 4/2020)
4. **IOF com indício de excesso** (validar cálculo legal conforme modalidade)
5. **Taxa mensal não informada** (Falta Transparência - CDC 46)

---

## Mapa de Violações por Banco

### FACTA Financeira
- [ ] Verificar se seguro está discriminado (risco alto de ocultação)
- [ ] Verificar CET (frequentemente > 80%)
- [ ] Verificar dados bancários completos (risco de "agência 0")

### Itaú
- [ ] Verificar tarifa de anuidade (comum não discriminada)
- [ ] Verificar se proteção creditícia tem assinatura específica
- [ ] Comparar taxa com média de mercado (ocasional acima)

### Bradesco
- [ ] Verificar se proteção está contratada sem autorização explícita
- [ ] Verificar tarifa de serviço (verificar se é opcional)
- [ ] Verificar se taxa está dentro de mercado (ocasional acima)

### Banco do Brasil
- [ ] Documentação geralmente melhor, mas verificar mesmo assim
- [ ] Seguro ocasional, mas menos comum que concorrentes

---

## Evidências de Coleta

Para cada irregularidade encontrada, **SEMPRE colete**:
1. Página do contrato (número)
2. Texto exato da cláusula
3. Fundamento legal violado (Lei, Súmula STJ, Decreto, CDC)
4. Impacto financeiro (valor, juros indevidos, etc)
5. Foto/screenshot para arquivo

---

## Resultado Final (Triagem)

Após completar os 20 pontos:
- **0-2 problemas**: Contrato aceitável (sem ação)
- **3-5 problemas**: Contrato questionável (ação administrativa)
- **6+ problemas**: Contrato com alta probabilidade de vício (ação judicial a validar pelo advogado)

### Documentar como:
- **Parecer Técnico**: Descrever todas as violações encontradas
- **Procuração**: Habilitar advogado para ação judicial
- **Petição Inicial**: Fundamentar em REsp do STJ + CDC
