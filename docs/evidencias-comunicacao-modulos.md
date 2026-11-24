# Evidências Funcionais — Comunicação entre `backend` e `modulo-ia`

## 1. Mecanismo e integração
- **Origem:** `backend/app/src/services/recomendacao.service.ts` (consumindo `backend/app/src/lib/modulo-ia.ts`).
- **Destino:** serviço de recomendação em `modulo-ia/` (`POST /recommendations` via BentoML).
- **Configuração:** `RECOMENDACAO_API_URL`, `RECOMENDACAO_API_KEY` (somente no servidor) e `RECOMENDACAO_TIMEOUT_MS`.

## 2. Tratamento de falhas e processamento dos dados
- Quando `modulo-ia` não está configurado, retorna status diferente de `200`, responde com formato inesperado, excede o *timeout* (`AbortSignal.timeout`) ou sofre erro de rede, `solicitarRecomendacoesIA` registra aviso e retorna `null`, acionando o fallback determinístico (`fonte: "baseline"`).
- Quando `modulo-ia` responde com sucesso, os itens `{ product_id, score, reason }` são mesclados aos dados do catálogo (`fonte: "ia"`).

## 3. Teste funcional e evidências de execução
- **Cenário 1 (`modulo-ia` ativo):** requisição a `/produtos/recomendacoes` retorna recomendações ranqueadas com `fonte: "ia"`.
- **Cenário 2 (`modulo-ia` indisponível/parado):** requisição a `/produtos/recomendacoes` faz fallback automático para `fonte: "baseline"` sem interromper o cliente.