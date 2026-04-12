# Base reutilizada para nova plataforma

Esta pasta foi criada a partir do projeto original com os módulos mais úteis para o novo produto de análise de contratos.

## Estrutura copiada

- backend (API, autenticação, banco, upload/análise, geração de documentos)
- frontend (base React + integração de API + páginas iniciais)

## Próximos ajustes recomendados

1. Permitir upload de imagem (JPG/PNG) além de PDF no endpoint de contratos.
2. Criar integração oficial com API de taxas médias do Banco Central (atualização a cada 12h).
3. Implementar motor de cálculo de impacto financeiro no backend.
4. Adaptar prompts e textos para deixar claro o limite legal: laudo técnico, não consultoria jurídica.
5. Adequar fluxos LGPD (consentimento, retenção e exclusão de dados).
6. Configurar novas variáveis de ambiente para Railway e Vercel.

## Deploy recomendado (Railway US$5 + Vercel)

### 1) Backend no Railway (pasta backend)

- Tipo de deploy: Dockerfile (já configurado em `backend/railway.toml`)
- Healthcheck: `GET /health` (já configurado)
- Start: definido no `backend/Dockerfile`

Variáveis de ambiente obrigatórias no Railway:

- `ANTHROPIC_API_KEY` = chave da Anthropic
- `SECRET_KEY` = chave JWT forte
- `DATABASE_URL` = URL PostgreSQL (recomendado) ou SQLite apenas para teste
- `ALLOWED_ORIGINS` = URL do frontend na Vercel (ex: `https://seu-app.vercel.app`)

Variáveis opcionais para integração Bacen (SGS):

- `BCB_SGS_SERIES_CLT` = código da série SGS para taxa média CLT
- `BCB_SGS_SERIES_BANCARIO_DIRETO` = código da série SGS para crédito pessoal
- `BCB_SGS_SERIES_SAUDE` = código da série SGS para linha de saúde
- `BCB_CACHE_FILE` = caminho do cache local (default: `/tmp/bcb_rates_cache.json`, atualização a cada 12h)

Variáveis opcionais úteis:

- `MOCK_MODE=true` para testes sem consumir tokens da IA
- `PORT` é injetada automaticamente pelo Railway

Observação de custo (plano US$5):

- Use 1 serviço backend (API) e evite múltiplos serviços em paralelo.
- Prefira banco externo com plano gratuito/incluso para reduzir consumo no Railway.
- Mantenha `MOCK_MODE=true` em homologação para não gastar tokens da Anthropic.

### 2) Frontend no Vercel (pasta frontend)

- Framework: Vite (React)
- Build command: `npm run build`
- Output directory: `dist`

Variável de ambiente no Vercel:

- `VITE_API_URL` = URL pública do backend Railway + `/api`
	- Exemplo: `https://seu-backend.up.railway.app/api`

### 3) Checklist rápido pós-deploy

1. Backend responde em `/health` com status saudável.
2. Frontend abre e autentica com sucesso.
3. Upload de contrato funciona.
4. Geração de documentos funciona (incluindo `relatorio_preliminar_pdf`).
5. CORS está liberado apenas para domínio do frontend.

## Deploy

- Backend: Railway (a partir da pasta backend)
- Frontend: Vercel (a partir da pasta frontend)

## Observabilidade de custo IA

Variaveis uteis no backend:

- `AI_MAX_OUTPUT_TOKENS` (default `2000`)
- `AI_PRECHECK_MAX_OUTPUT_TOKENS` (default `120`, usado na pre-analise antes do pagamento)
- `AI_INPUT_COST_PER_MTOK_USD` (default `3.0`)
- `AI_OUTPUT_COST_PER_MTOK_USD` (default `15.0`)
- `AI_USD_BRL_EXCHANGE_RATE` (default `5.0`)
- `OPS_METRICS_KEY` (obrigatoria para endpoint de metricas ops)
- `ALERT_WEBHOOK_URL` e `ALERT_COOLDOWN_SECONDS` (alertas operacionais)

Endpoint de metricas:

- `GET /api/public/ops/ai-metrics?days=7`
- Header obrigatorio: `X-Ops-Key: <OPS_METRICS_KEY>`
