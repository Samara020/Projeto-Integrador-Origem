#!/usr/bin/env bash
# Sobe o runtime descartável dos Testes End-to-End: banco próprio, backend em :4200 e
# frontend em :3200, recompilado com a URL dessa API. É o único alvo que o Cypress aceita
# (allowlist em e2e/cypress.config.js e preflight GET /__test/identity).
# Usado por testes.yml (regressão) e testes-smoke.yml. Antes de chamar: dependências do
# frontend e do backend instaladas, Prisma Client gerado e backend compilado (npm run build).
# Outro Postgres: PG_SERVIDOR=host:porta. Os logs e os PIDs ficam em relatorios/.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"

PG_SERVIDOR="${PG_SERVIDOR:-127.0.0.1:5432}"
PG_USUARIO="${PG_USUARIO:-origem_user}"
export PGPASSWORD="${PGPASSWORD:-ci-temporary-password}"
BANCO="${TEST_DATABASE_NAME:-origem_e2e_ci}"

mkdir -p relatorios

psql "postgresql://${PG_USUARIO}@${PG_SERVIDOR}/postgres" \
  -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS ${BANCO};" \
  -c "CREATE DATABASE ${BANCO};"

for sql in \
  01_create_tables.sql \
  02_integrity_rules.sql \
  04_create_indexes.sql \
  07_suporte_exclusao_logica_produto.sql \
  08_integracao_persistencia.sql \
  05_seed_dados_reais.sql; do
  psql "postgresql://${PG_USUARIO}@${PG_SERVIDOR}/${BANCO}" \
    -v ON_ERROR_STOP=1 -f "database/sql/$sql"
done

(cd frontend && NEXT_PUBLIC_API_URL=http://localhost:4200 npm run build > ../relatorios/frontend-e2e-build.log 2>&1)
(
  cd frontend
  API_BASE_URL=http://localhost:4200 BACKEND_URL=http://localhost:4200 nohup ./node_modules/.bin/next start -p 3200 > ../relatorios/frontend-e2e.log 2>&1 &
  echo $! > ../relatorios/frontend-3200.pid
)
(
  cd backend/app
  NODE_ENV=test ORIGEM_TEST_SERVER=1 PORT=4200 DATABASE_URL="postgresql://${PG_USUARIO}:${PGPASSWORD}@${PG_SERVIDOR}/${BANCO}?schema=public" CORS_ORIGIN=http://localhost:3200 nohup npm start > ../../relatorios/backend-e2e.log 2>&1 &
  echo $! > ../../relatorios/backend-4200.pid
)

timeout 60 bash -c 'until curl -sf -o /dev/null http://localhost:4200/health; do sleep 1; done'
timeout 60 bash -c 'until curl -sf -o /dev/null http://localhost:3200/; do sleep 1; done'
timeout 60 bash -c 'until curl -sf -o /dev/null http://localhost:4200/__test/identity; do sleep 1; done'
