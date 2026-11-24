# Evidencias Funcionais - Comunicacao entre backend e modulo-ia

## 1. Mecanismo e integracao
- Origem: backend/app/src/services/recomendacao.service.ts (consumindo backend/app/src/lib/modulo-ia.ts).
- Destino: servico de recomendacao em modulo-ia/ (POST /recommendations via BentoML na porta 3001, consumido pelo backend na porta 4000).
- Configuracao: RECOMENDACAO_API_URL, RECOMENDACAO_API_KEY e RECOMENDACAO_TIMEOUT_MS.

## 2. Execucao funcional e fallback
- Cenario 1 (modulo-ia ativo): GET /produtos/recomendacoes?produtoId=2001&limite=4 retornou x-recomendacao-fonte: ia (status=200, results=4).
- Cenario 2 (modulo-ia parado): apos docker compose stop modulo-ia, retornou x-recomendacao-fonte: baseline com fallback local.

## 3. Arquivo de logs
- Logs salvos em evidencias-comunicacao/logs-comunicacao.txt via docker compose logs --no-color backend modulo-ia.