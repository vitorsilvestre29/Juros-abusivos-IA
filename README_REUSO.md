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

## Deploy

- Backend: Railway (a partir da pasta backend)
- Frontend: Vercel (a partir da pasta frontend)
