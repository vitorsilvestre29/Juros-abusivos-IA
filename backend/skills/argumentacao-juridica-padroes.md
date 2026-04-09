# Argumentação Jurídica - Padrões e Precedentes

## Status de Validação Jurídica (v1)

**Objetivo**: reduzir risco de citação imprecisa em peças geradas por IA.

- **VALIDADA**: estrutura de argumentação (`Fato`, `Fundamento`, `Jurisprudência`, `Pedido`) e fluxo de pedidos.
- **REVISAR**: referências com divergência doutrinária/jurisprudencial ou redação excessivamente categórica.
- **SUBSTITUIR**: citações literais não confirmadas no próprio repositório.

### Mapa rápido por tese
- **Tese 1 (CET abusivo)**: `REVISAR`
- **Tese 2 (seguro/venda casada)**: `REVISAR`
- **Tese 3 (anatocismo/capitalização)**: `SUBSTITUIR`
- **Tese 4 (dados bancários incompletos)**: `REVISAR`
- **Tese 5 (IOF excedente)**: `VALIDADA` (manter cálculo legal e prova documental)
- **Tese 6 (tarifas abusivas)**: `REVISAR`
- **Tese 7 (transparência/inconsistência)**: `VALIDADA`
- **Tese 8 (enriquecimento sem causa)**: `REVISAR`

> Regra operacional: antes de protocolar, toda citação de REsp/Súmula deve ser conferida pelo advogado responsável no acórdão/súmula oficial.

---

## Propósito
Biblioteca de teses jurídicas consolidadas, argumentos-padrão e citações de precedentes do STJ para construção de peças processuais coerentes e fundamentadas em cada tipo de violação de contrato de crédito.

---

## Estrutura Geral de Argumento Jurídico

Toda tese deve seguir este padrão:

1. **Fato**: O que aconteceu no contrato (específico, com números)
2. **Fundamento Legal**: Lei, Súmula STJ, Decreto que foi violado
3. **Jurisprudência**: REsp ou precedente que reconhece a violação
4. **Conclusão**: Consequência legal (devolução, nulidade, dano moral)

---

## Tese 1: CET ABUSIVO (Custo Efetivo Total > 80% a.a.)

### Argumento-Padrão
**Fato**: "O contrato apresenta CET anual de XX%, calculado como (juros YY% + seguros ZZ% + taxas AA% + IOF BB%) capitalizados mensalmente, superando em muito a prática de mercado."

**Fundamento (REVISAR)**: 
- CDC art. 51, IV (abusividade por desequilíbrio)
- Jurisprudência do STJ sobre revisão de juros abusivos em contratos bancários
- REsp 1.061.530/RS (Tema 25) — **confirmar ementa/citação literal antes de uso em peça**

**Tese Jurídica**: 
"Manifesto desequilíbrio contratual verificado através da desproporcionalidade entre o CET contratado e as práticas de mercado. Para operações de [tipo de crédito], a taxa média de mercado é [X%], enquanto o contratado foi [Y%], configurando majoração abusiva."

**Precedente Exato (SUBSTITUIR)**:
> Inserir aqui **trecho literal conferido** no acórdão oficial do REsp 1.061.530/RS.

**Pedido**:
"Declarar nula a cláusula de juros abusivos e condenar o banco a restituir, em valores corrigidos, a diferença entre o CET pago e o máximo permitido, com juros de mora desde a data do pagamento indevido."

---

## Tese 2: VENDA CASADA - SEGURO NÃO AUTORIZADO

### Argumento-Padrão
**Fato**: "O seguro prestamista, no valor de R$ XX,XX (YY% do empréstimo), foi incluído no contrato sem assinatura específica de autorização, estando presente apenas na assinatura genérica do instrumento."

**Fundamento (REVISAR)**:
- CDC art. 39 (venda casada) — **conferir inciso exato antes de protocolar**
- CDC art. 6º, III e art. 46 (dever de informação clara e adequada)
- REsp 1.629.320/SP (Tema 972) — **conferir redação exata da tese**

**Tese Jurídica**:
"Venda casada presumida pela ausência de documento assinado especificamente autorizando a contratação do seguro. O simples ato de assinar contrato que já contém seguro incluído não constitui autorização válida, conforme consolidado na jurisprudência do STJ."

**Precedente Exato (SUBSTITUIR)**:
> Inserir aqui **trecho literal conferido** no acórdão oficial do REsp 1.629.320/SP.

**Aplicação Prática**:
- Se seguro foi cobrado: Prêmio + 0,5% ao mês de juros desde a contratação
- Cálculo: Valor do prêmio × (1 + 0,5%)^(número de meses decorridos)

**Pedido**:
"Declarar nula a contratação do seguro prestamista e condenar o banco a restituir integralmente o prêmio pago (R$ XX,XX) acrescido de juros de mora contados desde a data do pagamento indevido."

---

## Tese 3: ANATOCISMO (Juros Capitalizados)

### Argumento-Padrão
**Fato**: "O contrato prevê a 'capitalização mensal de juros', caracterizando o anatocismo vedado pela legislação bancária."

**Fundamento (SUBSTITUIR)**:
- Tema de capitalização/anatocismo exige **revisão técnica obrigatória** com jurisprudência atual e aplicável ao tipo de contrato.
- Não usar citação automática de súmula sem conferência textual no STJ.

**Tese Jurídica**:
"Anatocismo é a cobrança de juros sobre juros, ou seja, a capitalização composta de juros. Está expressamente vedada pela Lei 4.595/64 em operações de crédito com pessoas físicas, independentemente do que conste no contrato."

**Precedente Exato (SUBSTITUIR)**:
> Inserir julgado e trecho literal apenas após validação humana.

**Impacto Financeiro**:
Diferença entre juros simples (permitido) e juros compostos (cobrado).

**Pedido**:
"Declarar nulo o sistema de capitalização de juros e condenar o banco a recalcular todas as parcelas usando juros simples, restituindo a diferença cobrada indevidamente."

---

## Tese 4: DADOS BANCÁRIOS INCOMPLETOS (Agência "0")

### Argumento-Padrão
**Fato**: "Os dados bancários constantes do contrato indicam agência '0' ou conta genérica, não identificando a conta específica na qual os valores foram depositados."

**Fundamento (REVISAR)**:
- CDC art. 46 (direito à informação clara)
- Resolução BCB 4/2020 art. 46 (exigência de identificação precisa)
- Jurisprudência aplicável ao caso concreto — **evitar afirmar consolidação sem citação validada**

**Tese Jurídica**:
"A impossibilidade de identificar com precisão a conta bancária destinatária dos valores configura violação do direito à informação clara e precisa, além de impossibilitar futuro rastreamento dos recursos, violando direitos fundamentais do consumidor."

**Consequência Legal**:
- Nulidade parcial da cláusula de identificação bancária
- Direito a dano moral por violação do direito à informação
- Possível nulidade da operação se não puder ser identificada

**Pedido**:
"Reconhecer a nulidade da cláusula de dados bancários incompletos e condenar o banco a indenização por dano moral no montante de R$ [X], correspondente à violação dos direitos informativos do consumidor."

---

## Tese 5: IOF (IMPOSTO SOBRE OPERAÇÕES FINANCEIRAS) EXCEDENTE

### Argumento-Padrão
**Fato**: "O contrato cobrou IOF no valor de XX% ou R$ YY, superando o máximo legal estabelecido pelo Decreto 6.306/2007."

**Fundamento (VALIDADA com revisão pontual de números)**:
- Decreto 6.306/2007 (regulamenta alíquotas máximas de IOF)
- Lei 10.865/2004 (institui IOF)
- Para consignado: máximo 0,0082% ao dia + 0,38% = ~3% total
- Para pessoa física CLT: máximo 1,5%

**Tese Jurídica**:
"A cobrança de IOF acima das alíquotas máximas estabelecidas em decreto federal constitui ilegalidade manifesta, configurando enriquecimento sem causa do banco."

**Cálculo Correto**:
- IOF deve ser calculado conforme modalidade, prazo e base legal vigente
- Sempre validar o cálculo com planilha/Python antes de fundamentar a tese

**Exemplo**:
Consignado de 30 dias: (0,0082 × 30) + 0,38 = 0,246% + 0,38% = 0,626% total

**Pedido**:
"Condenar o banco a restituir o IOF cobrado indevidamente, correspondente à diferença entre o IOF pago e o máximo legal permitido, acrescido de juros de mora."

---

## Tese 6: TARIFA ABUSIVA (Cadastro, Abertura, Anuidade)

### Argumento-Padrão
**Fato**: "O contrato inclui tarifa de [tipo] no valor de R$ XX,XX, representando YY% do valor do empréstimo, sem justificativa legal ou desproporcionalidade clara."

**Fundamento (REVISAR)**:
- CDC art. 51, IV (cláusulas abusivas por desequilíbrio)
- Jurisprudência aplicável deve ser citada por caso — evitar regra percentual rígida sem fonte validada
- Tarifa deve ser opcional e claramente justificada

**Tese Jurídica**:
"Tarifa administrativa que representa percentual excessivo do valor do empréstimo constitui cláusula abusiva, violando o equilíbrio contratual. O consumidor não deve ser penalizado com custos desproporcionais pela simples administração de operação de crédito."

**Limites Recomendados**:
- Tarifa de cadastro: máximo 2% do valor
- Taxa de abertura: máximo 3% do valor
- Tarifa de anuidade: deve ser opcional

**Pedido**:
"Declarar abusivas as cláusulas de tarifa e condenar o banco a restituir os valores cobrados indevidamente, acrescidos de juros de mora."

---

## Tese 7: FALTA DE TRANSPARÊNCIA / CÁLCULO INCONSISTENTE

### Argumento-Padrão
**Fato**: "O contrato não indica claramente a taxa mensal de juros, ou apresenta discrepâncias entre a taxa mensalada e o CET anual divulgado, ou a tabela de amortização não corresponde aos cálculos."

**Fundamento (VALIDADA)**:
- CDC art. 46 (direito à informação clara)
- CDC art. 6º, III (hipossuficiência do consumidor)
- Lei de Transparência de Operações de Crédito

**Tese Jurídica**:
"A clareza e precisão das informações contratuais é direito fundamental do consumidor. Contratos que ocultam, omitem ou apresentam inconsistências nas taxas violam o direito à informação e permitem presunção de má-fé."

**Aplicação**:
Se contrato não especifica taxa mensal claramente, presume-se a favor do consumidor (interpretação contra proferentem).

**Pedido**:
"Anular o contrato ou, alternativamente, recalcular a operação com as taxas máximas de mercado, dado que o banco falhou em sua obrigação de informação."

---

## Tese 8: ENRIQUECIMENTO SEM CAUSA

### Argumento-Padrão
**Fato**: "Somadas todas as cobranças abusivas, o banco recebeu valor total superior ao devido pela operação de crédito."

**Fundamento (REVISAR)**:
- Código Civil art. 884-886 (enriquecimento sem causa)
- Inserir apenas súmula/julgado diretamente pertinente ao contexto bancário após validação

**Tese Jurídica**:
"Ainda que isoladamente algumas cobranças pudessem ser justificadas, o conjunto delas configura enriquecimento sem causa. O banco aufere lucro excessivo pela operação, devendo ser restituído ao consumidor."

**Cálculo**:
Total recebido pelo banco - Valor da operação = Enriquecimento

**Pedido**:
"Condenar o banco ao pagamento da diferença entre o total cobrado e o devido, considerando a operação com taxas legais máximas."

---

## Mapas de Citação Rápida

### Por Tipo de Operação

**CLT (desconto em folha)**:
- Faixa de referência interna: 3,0% a 4,5% a.m.
- Alerta de abusividade (triagem): > 6% a.m.
- Vício comum: seguro não autorizado, tarifa embutida, CET desproporcional

**Bancário Direto (crédito pessoal)**:
- Faixa de referência interna: 4% a 5% a.m.
- Alerta de abusividade (triagem): > 7% a.m.
- Vício comum: CET elevado, venda casada, tarifa sem transparência

**Pessoal/Saúde**:
- Máximo: 7-8% a.m. (conforme setor)
- REsp aplicável: 1.061.530/RS
- Vício comum: CET > 100% a.a., venda casada

---

## Dicas de Redação

1. **Sempre cite REsp em número exato** (não "REsp da jurisprudência")
2. **Quantifique o dano** (R$ XX,XX, não "valores")
3. **Use "presumido" para venda casada** (sem assinatura específica)
4. **Use "manifesto" para CET > 80%** (não precisa de prova adicional)
5. **Cite o STJ como autoridade última** em matéria de juros abusivos
6. **Não use citação literal sem conferência no acórdão/súmula oficial**
