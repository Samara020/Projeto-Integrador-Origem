# ADR-002 — Remoção da Fake API e uso exclusivo do backend principal

- **Status:** Superada / Atualizada (integração backend Express + PostgreSQL concluída)
- **Data do registro original:** 07/11/2026 · **Atualizada em:** 17/11/2026
- **Responsável pelo registro:** Equipe de desenvolvimento do projeto Origem.

## Contexto

Na Avaliação 1, o frontend manteve rotas Next.js de Fake API (`frontend/src/app/api/`) e dados simulados (`frontend/src/mocks/`) enquanto o backend Express (`backend/app/`) estava em construção.

Na integração frontend/backend, constatou-se que a manutenção da Fake API e do fallback implícito para `/api` mascarava falhas de contrato nos testes de API, E2E e CI.

## Decisão

1. Remover `frontend/src/app/api/`, `frontend/src/mocks/`, `frontend/src/lib/fake-api.ts` e `frontend/src/lib/modulo-ia.ts`.
2. Manter `frontend/src/lib/http.ts` apontando exclusivamente para o backend Express (`NEXT_PUBLIC_API_URL`, padrão `http://localhost:4000`; `API_BASE_URL` / `BACKEND_URL` / `NEXT_PUBLIC_API_URL` no servidor).
3. Migrar os testes de API, E2E (Cypress) e pipelines de CI (`.github/workflows/`) para executar contra o backend Express + PostgreSQL reais com JWT assinado e dados próprios.

## Consequências

- Não há mais simulação local de autenticação, produtos, avaliações, pedidos, pagamentos, suporte ou painéis administrativos no frontend.
- Os testes de API (`npm run test:api`) e E2E (`npm run test:e2e`) validam o fluxo real `Frontend → Backend Express → Prisma → PostgreSQL`.
- Permanecem no `localStorage` apenas dados estritamente locais do navegador (carrinho de visitante, histórico de visitas, lista de comparação e rascunho não publicado).
