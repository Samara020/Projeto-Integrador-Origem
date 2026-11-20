# Retomada — Card Trello #18

Atualizado em 20/11/2026. Este documento registra onde a execução foi pausada e o próximo passo.

## Estado do repositório

- Branch: `corrige-integracao-card-18`.
- Base anterior: `5bda764c80e4d93e648066650a68d79c9745c26d`.
- Commits locais criados, ainda sem push:
  - `763d260` — corrige persistencia e validacao da integracao com a API.
  - `55ebdd9` — ajusta frontend para integracao com a API real.
  - `4aac5bb` — adiciona cobertura E2E para integracao da API.
- A árvore ficou limpa após esses commits. O relatório de retomada será salvo em um commit próprio.
- O Trello não foi alterado nesta rodada. Confirmar o estado atual do card antes de qualquer mudança no portal.

## Correções registradas

- Backend: persistência dos campos ricos/SKU, migrações versionadas, validação de cadastro e de atualização de produto, atualização de quantidade no carrinho e proteção transacional de pedidos contra transições concorrentes após estado terminal.
- Frontend: integração dos services, normalização e exibição de campos, tratamento de sessão/erros, dashboards e testes unitários/API.
- E2E: allowlist de origens, preflight de identidade do banco, cobertura de acesso/cadastro/compra/vitrine/desempenho e documentação de inicialização standalone.

## Verificações concluídas

- Backend: build TypeScript aprovado; 10 suítes e 150 testes aprovados no banco descartável `origem_card18_test` em `:55432`.
- Frontend: lint aprovado; `next typegen` e typecheck aprovados; 13 suítes e 206 testes unitários aprovados; build Next.js 16.4.6 aprovado com 25 rotas.
- Cypress: segunda rodada, 20/11/2026 16:10–16:11 −03, exit 0, 42/42 testes, cinco specs, sem falhas/pendentes/ignorados:
  - `acesso.cy.js`: 15/15.
  - `cadastro-peca.cy.js`: 3/3.
  - `compra.cy.js`: 10/10.
  - `desempenho.cy.js`: 3/3.
  - `vitrine.cy.js`: 11/11.
- TC09 passou com dez medições por operação e limites de média ≤ 2 s e máximo ≤ 4 s. O relatório de execução não preservou os valores numéricos individuais/médias.
- A API de teste confirmou `environment=test`, `database=origem_card18_test`; conexão somente ao Postgres descartável em `:55432`. O banco principal `:5432` e os serviços principais `:3000/:4000` não foram usados.
- O primeiro intento Cypress foi encerrado como inválido por montagem incompleta do build standalone (chunks/imagens 404). Após copiar `static` e `public` para o standalone, reiniciar a UI e confirmar HTTP 200, a segunda rodada passou. O README E2E agora documenta essa inicialização.

## Banco e runtime de teste

- A API de teste e a UI em `:4200/:3200` foram paradas após a rodada. O container PostgreSQL descartável `origem-card18-audit` em `:55432` continua disponível.
- O Cypress gravou dados sintéticos e não foi feito cleanup/reset. O retrato final lido pelo gerente registrou 46 usuários, 13 lojas, 14 produtos/estoques, 12 carrinhos, 3 linhas de carrinho, 4 pedidos, 4 linhas de pedido, 4 pagamentos e 8 históricos. Esses registros permanecem no banco.
- A suíte E2E não é idempotente. Ao retomar, usar uma nova base descartável com schema preparado pelos responsáveis ou documentar uma estratégia isolada de fixtures; não rodar novamente sobre os mesmos dados sem avaliar o impacto. Não executar migrations, setup ou reset no banco principal.

## Próximo passo ao retomar

Consolidar uma matriz dos 15 critérios oficiais do card, ligando cada item a evidência efetivamente coletada e registrando o que ainda falta. Os cinco specs aprovados cobrem os cenários listados, mas não provam automaticamente todos os quinze critérios nem toda variação de permissões, persistência e falha. **Não declarar 15/15 nem atualizar o Trello até concluir esse cruzamento e resolver as lacunas que ele apontar.**

Relatório completo do gerente e artefatos Cypress válidos:

- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/RELATORIO_CARD18_LIVE_FINAL.md`
- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/manifest.json`
- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/logs/cypress-run.log`
- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/logs/cypress-command.json`
- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/logs/junit-summary.json`
- `/tmp/origem-card18-live-20261120-1539-3e6ctt7k/attempt-2-1609/logs/synthetic-writes.json`
