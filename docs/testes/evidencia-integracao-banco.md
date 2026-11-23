# Evidência de Integração com Banco de Dados (PostgreSQL)

- **Data:** 2026-11-23
- **Banco de dados de teste:** `origem_teste` (`postgresql://origem_user:***@localhost:5433/origem_teste?schema=public`)
- **Log de referência:** `docs/testes/log-integracao-postgres-2026-11-23.txt`
- **Resultado:** **12/12 suítes aprovadas** e **175/175 testes aprovados** (0 falhas).

## Correções validadas nesta execução
1. **Concorrência no checkout e atualização de status de pedidos (`backend/app/src/repositories/pedido.repository.ts`):**
   - Lock de linha com `FOR UPDATE` em `carrinho` (`id_carrinho`) com releitura dos itens dentro da transação e priorização do preço atual do produto.
   - Lock de linha com `FOR UPDATE` em `pedido` (`id_pedidos`) com bloqueio (`409`) para transições em status finais (`ENTREGUE`, `CANCELADO`) e reposição única de estoque no cancelamento.
2. **Uso único simultâneo de token de redefinição de senha (`backend/app/src/lib/revogacao-token.ts` e `backend/app/src/services/auth.service.ts`):**
   - Implementação de `consumirTokenUsoUnico` com `INSERT INTO tokens_revogados (token_hash, expira_em) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING RETURNING token_hash` antes da alteração da senha.
3. **Ajustes de suítes de integração (`backend/app/tests/pedidos.test.ts` e `backend/app/tests/integracao-persistencia.test.ts`):**
   - Expressão regular de bloqueio global para pedidos com itens de múltiplas/várias lojas e timeout de `15000ms` na transação de lock do carrinho.
   - Teste de uso único simultâneo validando o fluxo via `/auth/recuperar-senha` e `/auth/redefinir-senha` com retorno `[200, 401]`.
