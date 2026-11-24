# Evidências Funcionais — Comunicação entre `backend` e `modulo-ia`

## 1. Mecanismo e integração
- **Origem:** `backend/app/src/services/recomendacao.service.ts` (consumindo `backend/app/src/lib/modulo-ia.ts`).
- **Destino:** serviço de recomendação em `modulo-ia/` (`POST /recommendations` via BentoML na porta `3001`, consumido pelo `backend` na porta `4000`).
- **Configuração:** `RECOMENDACAO_API_URL`, `RECOMENDACAO_API_KEY` (somente no servidor) e `RECOMENDACAO_TIMEOUT_MS`.

## 2. Tratamento de falhas e processamento dos dados
- **Com `modulo-ia` ativo:** `GET /produtos/recomendacoes?produtoId=2001&limite=4` retornou cabeçalho `x-recomendacao-fonte: ia`, com requisição `POST /recommendations` (`status=200`, `results=4`) registrada no BentoML.
- **Com `modulo-ia` parado (`docker compose stop modulo-ia`):** a mesma requisição retornou cabeçalho `x-recomendacao-fonte: baseline` sem interromper o cliente, com o `backend` registrando aviso de indisponibilidade/timeout e aplicando o fallback determinístico local.

## 3. Arquivos de evidência gerados
- Logs combinados do Docker Compose salvos em `evidencias-comunicacao/logs-comunicacao.txt`.