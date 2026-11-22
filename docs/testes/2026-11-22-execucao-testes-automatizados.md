# Relatório de Execução de Testes Automatizados

**Data:** 22/11/2026  
**Branch:** `main`  
**Commit base (Rodada 1):** `b33614c` (`b33614c240827d45938f22f87ec6c702d6560cf7`)  
**Rodada 2:** pós-correção dos defeitos `F-01` a `F-04`, validação de curadoria (`HU-03`) e inclusão de testes automatizados para fluxos críticos (`fluxos-criticos.test.ts` e `produto-service.unit.test.ts`).  
**Objetivo:** registrar de forma reproduzível as execuções das suítes automatizadas do projeto Origem, documentando comandos, ambiente, resultados aprovados/reprovados, evidências de erro, correções aplicadas e rastreabilidade com as histórias de usuário (HUs) do backlog.

---

## 1. Ambiente de Execução

| Item | Versão / Configuração |
|---|---|
| Sistema Operacional (host) | Windows (PowerShell) |
| Node.js (host) | `v24.19.0` |
| npm (host) | `11.17.0` |
| Python (host) | `3.14.7` (sem `pytest` instalado globalmente) |
| Containers Docker | `postgres:17` (`origem-postgres`), `origem-backend` (`node:24-slim`), `origem-modulo-ia` (`python:3.13.18`, `pytest 9.1.1`, `bentoml 1.4.39`) |
| Endpoints ativos na rodada integrada | Backend `http://localhost:4000`, Módulo IA `http://localhost:3001`, PostgreSQL `localhost:5433` |

---

## 2. Resumo Consolidado das Execuções

### 2.1. Rodada 1 — Diagnóstico inicial (commit `b33614c`)

| # | Camada / Suíte | Comando Executado | Resultado | Aprovados | Reprovados | Pulados | Tempo |
|---|---|---|---|---:|---:|---:|---:|
| 1 | Frontend — Unitários (Jest) | `npm --prefix frontend run test:unit` | **Aprovado** | 203 (14 suítes) | 0 | 0 | 10,01 s |
| 2 | Backend — Unitários (Jest) | `npm --prefix backend/app run test:unit` | **Aprovado** | 76 (4 suítes) | 0 | 0 | 6,37 s |
| 3 | Módulo IA — Unitários, Serviço, HTTP e Desempenho (Pytest em container) | `docker run --rm -v "$PWD/modulo-ia/tests:/app/tests:ro" --entrypoint /venv/bin/python origem-modulo-ia -m pytest /app/tests -v` | **Aprovado** | 27 (4 arquivos) | 0 | 0 | 8,91 s |
| 4 | Frontend — Integração de API (Jest paralelo padrão) | `npm --prefix frontend run test:api` | **Reprovado** | 35 (4 suítes) | 19 (3 suítes) | 6 (1 suíte) | 31,53 s |
| 5 | Frontend — Integração de API (Jest sequencial `--runInBand`) | `npm --prefix frontend run test:api -- --runInBand` | **Reprovado** | 47 (5 suítes) | 7 (2 suítes) | 6 (1 suíte) | 33,00 s |
| 6 | Backend — Suíte completa com banco de testes (Jest) | `npm --prefix backend/app test` | **Bloqueado (ambiente)** | 0 | 12 suítes não iniciadas | 0 | 6,74 s |
| 7 | Verificações estáticas (ESLint + `tsc`) | `npm --prefix frontend run lint` e `npm --prefix backend/app run build` | **Aprovado** | 2 checks | 0 | 0 | — |

### 2.2. Rodada 2 — Pós-correções e ampliação de testes críticos

| # | Camada / Suíte | Comando Executado | Resultado | Aprovados | Reprovados | Pulados | Tempo |
|---|---|---|---|---:|---:|---:|---:|
| 1 | Frontend — Unitários (Jest) | `npm --prefix frontend run test:unit` | **Aprovado** | 203 (14 suítes) | 0 | 0 | 11,43 s |
| 2 | Backend — Unitários (Jest) | `npm --prefix backend/app run test:unit` | **Aprovado** | 80 (4 suítes) | 0 | 0 | 7,57 s |
| 3 | Módulo IA — Pytest em container | `docker run --rm -v "$PWD/modulo-ia/tests:/app/tests:ro" --entrypoint /venv/bin/python origem-modulo-ia -m pytest /app/tests -v` | **Aprovado** | 27 (4 arquivos) | 0 | 0 | 8,91 s |
| 4 | Frontend — Integração de API contra backend real (`maxWorkers: 1`) | `npm --prefix frontend run test:api` | **Aprovado** | 61 (8 suítes) | 0 | 6 (1 suíte) | 57,04 s |
| 5 | Backend — Suíte completa com banco de testes (Jest) | `npm --prefix backend/app test` | **Bloqueado (ambiente)** | 0 | 12 suítes não iniciadas | 0 | 6,74 s |
| 6 | Verificações estáticas (ESLint + `tsc`) | `npm --prefix frontend run lint` e `npm --prefix backend/app run build` | **Aprovado** | 2 checks | 0 | 0 | — |

---

## 3. Detalhamento por Suíte (Estado Atual — Rodada 2)

### 3.1. Frontend — Testes Unitários (`frontend/tests/unit/`)

Comando: `npm --prefix frontend run test:unit`  
Resultado: **14/14 suítes aprovadas · 203/203 testes aprovados (11,429 s)**

| Suíte | Status | HUs Relacionadas |
|---|---|---|
| `tests/unit/admin.test.ts` | Aprovado | HU-03, HU-16, HU-21 |
| `tests/unit/auth.test.ts` | Aprovado | HU-01 |
| `tests/unit/carrinho.test.ts` | Aprovado | HU-08, HU-11, HU-12 |
| `tests/unit/dashboard-admin.test.tsx` | Aprovado | HU-16 |
| `tests/unit/destino.test.ts` | Aprovado | HU-01 |
| `tests/unit/estados-e-sessao.test.tsx` | Aprovado | HU-01, HU-04 |
| `tests/unit/estoque-artesao.test.tsx` | Aprovado | HU-11, HU-12, HU-15 |
| `tests/unit/guarda-papel.test.tsx` | Aprovado | HU-01, HU-16 |
| `tests/unit/painel-artesao.test.ts` | Aprovado | HU-02, HU-14, HU-15 |
| `tests/unit/pedidos.test.ts` | Aprovado | HU-09, HU-10, HU-13, HU-14 |
| `tests/unit/produtos.test.ts` | Aprovado | HU-02, HU-04, HU-05, HU-06 |
| `tests/unit/recomendacoes.test.tsx` | Aprovado | HU-17 |
| `tests/unit/services-integracao.test.ts` | Aprovado | HU-04, HU-05, HU-07, HU-08, HU-09 |
| `tests/unit/validacao.test.ts` | Aprovado | HU-02 |

### 3.2. Backend — Testes Unitários (`backend/app/tests/`)

Comando: `npm --prefix backend/app run test:unit`  
Resultado: **4/4 suítes aprovadas · 80/80 testes aprovados (7,566 s)** (+4 testes adicionados em `produto-service.unit.test.ts` para filtro `origem` e regras de curadoria `validar()`).

| Suíte | Status | HUs Relacionadas |
|---|---|---|
| `tests/aed-buscas.test.ts` | Aprovado | HU-06 |
| `tests/aed-estruturas.test.ts` | Aprovado | HU-04, HU-06, HU-17 |
| `tests/produto-service.unit.test.ts` | Aprovado | HU-02, HU-03, HU-04, HU-05, HU-06, HU-12 |
| `tests/recomendacoes.unit.test.ts` | Aprovado | HU-17 |

### 3.3. Módulo de IA (`modulo-ia/tests/`)

Comando: `docker run --rm -v "$PWD/modulo-ia/tests:/app/tests:ro" --entrypoint /venv/bin/python origem-modulo-ia -m pytest /app/tests -v`  
Resultado: **4/4 arquivos aprovados · 27/27 testes aprovados (8,91 s, 28 avisos de deprecação de dependências)**

| Arquivo | Testes | Status | HUs Relacionadas |
|---|---:|---|---|
| `tests/test_api.py` | 8 | Aprovado | HU-17 |
| `tests/test_performance.py` | 1 | Aprovado (10.000 produtos) | HU-17 |
| `tests/test_recommendation.py` | 15 | Aprovado | HU-17 |
| `tests/test_service.py` | 3 | Aprovado | HU-17 |

### 3.4. Frontend — Testes de Integração de API (`frontend/tests/api/`, contra backend real)

Comando: `npm --prefix frontend run test:api`  
Resultado: **8/8 suítes ativas aprovadas, 1 pulada · 61 aprovados, 0 reprovados, 6 pulados (57,039 s)**

| Suíte | Status (Rodada 1 → Rodada 2) | Detalhe | HUs Relacionadas |
|---|---|---|---|
| `tests/api/auth.test.ts` | Reprovado (6 falhas) → **Aprovado** | Asserções de `TC01` e mensagens de validação em `POST /auth/register` alinhadas ao contrato atual | HU-01 |
| `tests/api/produtos.test.ts` | Reprovado (1 falha) → **Aprovado** | Filtro `GET /produtos?origem=...` corrigido no backend e validado contra Postgres | HU-04, HU-05, HU-06, HU-11, HU-12 |
| `tests/api/fluxos-criticos.test.ts` | *Nova suíte* → **Aprovado (7/7)** | Concorrência de peça única entre 2 compradores, revalidação de carrinho, anti-enumeração, reprovação com justificativa, moderação + recálculo de média, cancelamento restaurando estoque e peça `SOB_ENCOMENDA` | HU-01, HU-02, HU-03, HU-08, HU-11, HU-12, HU-14, HU-20, HU-21 |
| `tests/api/fluxos-integrados.test.ts` | Aprovado → **Aprovado** | Persistência completa de perfil do artesão, produto, carrinho, checkout, pagamento, avaliação, suporte e personalização | HU-02, HU-03, HU-07, HU-08, HU-09, HU-10, HU-19, HU-22, HU-24 |
| `tests/api/admin.test.ts` | Aprovado → **Aprovado** | RBAC (401/403), fila de pendentes, moderação e perfil/senha do admin | HU-01, HU-03, HU-16, HU-21 |
| `tests/api/catalogo.test.ts` | Aprovado → **Aprovado** | Categorias, técnicas, regiões, indicadores, 404 e tempo de resposta (TC09) | HU-04, HU-06, HU-07 |
| `tests/api/recomendacoes.test.ts` | Timeout paralelo → **Aprovado** | Recomendações reais sem repetir referência e excluindo vendidas | HU-17 |
| `tests/api/modulo-ia.test.ts` | Aprovado → **Aprovado** | Contrato HTTP da IA, autenticação `X-API-Key` e limites | HU-17 |
| `tests/api/recomendacoes-integracao.test.ts` | Pulado → **Pulado (6 testes)** | Condicionado à variável `BACKEND_URL` (suíte usa `describe.skip` quando não definida) | HU-17 |

### 3.5. Backend — Testes de Integração com PostgreSQL (`backend/app/tests/`)

Comando: `npm --prefix backend/app test`  
Resultado: **Bloqueado por pré-requisito de ambiente (12/12 suítes interrompidas no `setupFiles` `tests/env.ts`)**

Suítes não executadas por ausência de `DATABASE_URL_TEST`: `artesaos.test.ts`, `auth-permissoes.test.ts`, `auth.test.ts`, `integracao-persistencia.test.ts`, `pedidos.test.ts`, `produtos-posse.test.ts`, `produtos.test.ts`, `seguranca-regressao.test.ts` (além das 4 suítes unitárias já validadas em `test:unit`).

---

## 4. Erros Encontrados na Rodada 1, Evidências e Correções Aplicadas

### Erro 1 (F-01) — Defeito funcional: filtro `origem` ignorado em `GET /produtos` — **Corrigido**
- **Classificação:** defeito funcional no backend.
- **Evidência na Rodada 1 (`frontend/tests/api/produtos.test.ts`):**
  ```text
  GET /produtos?origem=valor-que-nao-existe-xyz
  Expected: { total: 0, itens: [] }
  Received: { total: 31, itens: [ ... ] }
  ```
- **Causa raiz:** `produtoService.listar()` em `backend/app/src/services/produto.service.ts` não repassava `origem: filtros.origem` ao `produtoRepository.listar()`.
- **Correção aplicada:** repasse de `origem: filtros.origem` em `produtoService.listar()`, novo teste unitário em `backend/app/tests/produto-service.unit.test.ts` e revalidação na API real (`produtos.test.ts` aprovado).
- **História relacionada:** **HU-06 — Busca e filtros** (e **HU-04 — Vitrine**).

### Erro 2 (F-02) — Falha de asserção nos testes de login (`TC01`) em `frontend/tests/api/auth.test.ts` — **Corrigido**
- **Classificação:** defeito no teste automatizado (falso negativo em 3 cenários: `COMPRADOR`, `ARTESAO`, `ADMINISTRADOR`).
- **Evidência na Rodada 1:**
  ```text
  frontend/tests/api/auth.test.ts:18
  expect(JSON.stringify(conta)).not.toContain(conta.senha);
  Received string: "{\"token\":\"eyJ...\",\"tipo\":\"Bearer\",\"usuario\":{...},\"email\":\"...\",\"senha\":\"SenhaTeste123\"}"
  ```
- **Causa raiz:** o helper `registrarELogar()` anexa `{ email, senha }` ao objeto `conta`; a resposta HTTP real da API não expõe a senha.
- **Correção aplicada:** asserção ajustada para inspecionar apenas o payload público retornado pela API (`{ token, tipo, usuario }`).
- **História relacionada:** **HU-01 — Autenticação e perfis de acesso**.

### Erro 3 (F-03) — Divergência de mensagens de validação em `POST /auth/register` — **Corrigido**
- **Classificação:** teste desatualizado frente à evolução das validações do backend (3 cenários: `sem nome`, `sem email`, `sem senha`).
- **Evidência na Rodada 1:**
  ```text
  frontend/tests/api/auth.test.ts:98
  - Expected: { "mensagem": "Preencha nome, e-mail e senha." }
  + Received (sem nome):  { "mensagem": "Informe um nome válido com pelo menos 2 caracteres." }
  + Received (sem email): { "mensagem": "Informe um endereço de e-mail válido." }
  + Received (sem senha): { "mensagem": "A senha precisa ter pelo menos 8 caracteres." }
  ```
- **Correção aplicada:** expectativas em `frontend/tests/api/auth.test.ts` atualizadas para as mensagens específicas por campo.
- **História relacionada:** **HU-01 — Autenticação e perfis de acesso**.

### Erro 4 (F-04) — Instabilidade por timeout (15 s) na execução paralela de `npm run test:api` — **Corrigido**
- **Classificação:** problema de configuração/concorrência de testes.
- **Evidência na Rodada 1:** timeout de 15 s nos hooks `beforeAll` de `produtos.test.ts` (11 testes) e `recomendacoes.test.ts` (2 testes) sob workers paralelos com `bcrypt`.
- **Correção aplicada:** definido `maxWorkers: 1` em `frontend/jest.api.config.mjs`. A execução padrão `npm --prefix frontend run test:api` passou sem timeouts (61/61).
- **Histórias relacionadas:** **HU-04, HU-05, HU-06, HU-17**.

### Erro 5 (F-05) — Lacuna funcional identificada na revisão: reprovação sem justificativa em `PUT /produtos/admin/produtos/:id/validacao` — **Corrigido**
- **Classificação:** defeito funcional no backend (identificado ao implementar cobertura de HU-03).
- **Causa raiz:** `produtoService.validar()` aceitava `status: "REPROVADA"` com `justificativa` vazia ou em branco e não validava status fora de `APROVADA | REPROVADA`.
- **Correção aplicada:** validação explícita retornando HTTP `400` para status inválido ou reprovação sem justificativa, coberta por testes unitários (`produto-service.unit.test.ts`) e teste integrado (`fluxos-criticos.test.ts`).
- **História relacionada:** **HU-03 — Validação de origem e autenticidade**.

### Bloqueios de Ambiente Registrados (sem defeito de código)
1. **Banco de testes do backend (`DATABASE_URL_TEST`):** `npm --prefix backend/app test` aborta em `tests/env.ts:8` com `DATABASE_URL_TEST nao definido` para proteger os dados de desenvolvimento.
2. **Suíte `recomendacoes-integracao.test.ts` pulada (6 testes):** depende de `BACKEND_URL` definido no ambiente e serviço `frontend` ativo na porta `3000`.
3. **`pytest` ausente no Python do host Windows:** execução validada dentro da imagem Docker `origem-modulo-ia` (27/27 aprovados).

> **Registro histórico da sessão (commit `b33614c`):** antes da Rodada 1, o catálogo na web apresentava erro 500 (`PrismaClientKnownRequestError P2022: The column produto.sku does not exist`) por ausência das 8 novas colunas de `produto` em `database/sql/08_integracao_persistencia.sql`. Corrigido de forma idempotente em `b33614c`.

---

## 5. Matriz de Falhas, Correções e Rastreabilidade com Histórias de Usuário

| ID | Falha / Bloqueio | Tipo | HU(s) Impactada(s) | Situação Atual | Evidência / Próxima Ação |
|---|---|---|---|---|---|
| F-01 | `GET /produtos?origem=...` ignorava o filtro e retornava todo o catálogo | Defeito funcional | HU-06, HU-04 | **Corrigido e validado** | `produto.service.ts` corrigido; aprovado em `produto-service.unit.test.ts` e `produtos.test.ts` |
| F-02 | `auth.test.ts` verificava `conta.senha` no objeto do helper | Defeito no teste | HU-01 | **Corrigido e validado** | `auth.test.ts` valida payload público da API; aprovado na Rodada 2 |
| F-03 | `auth.test.ts` esperava mensagem genérica antiga no cadastro | Desatualização de teste | HU-01 | **Corrigido e validado** | Mensagens alinhadas por campo em `auth.test.ts`; aprovado na Rodada 2 |
| F-04 | `npm run test:api` sofria timeout em `beforeAll` em paralelo | Configuração de teste | HU-04, HU-05, HU-06, HU-17 | **Corrigido e validado** | `maxWorkers: 1` em `jest.api.config.mjs`; 61/61 sem timeout |
| F-05 | Reprovação na curadoria aceitava justificativa vazia | Defeito funcional | HU-03 | **Corrigido e validado** | `produtoService.validar()` retorna `400`; coberto em unitário e `fluxos-criticos.test.ts` |
| B-01 | `backend/app` `npm test` bloqueado sem `DATABASE_URL_TEST` | Pré-requisito de ambiente | HU-01 a HU-16 | **Pendente (ambiente)** | Provisionar banco descartável (`origem_test`) com scripts `01`, `02`, `04` e executar `npm --prefix backend/app test` |
| B-02 | `recomendacoes-integracao.test.ts` pulado sem `BACKEND_URL` | Pré-requisito de ambiente | HU-17 | **Pendente (ambiente)** | Subir serviço `frontend` no Compose e executar com `BACKEND_URL=http://localhost:4000` |

---

## 6. Lacunas de Cobertura Automatizada Remanescentes

Mesmo após a ampliação da Rodada 2 (que cobriu concorrência entre compradores em peça única, revalidação de estoque no carrinho, anti-enumeração, curadoria com justificativa obrigatória, moderação com recálculo de média, cancelamento restaurando estoque e peças `SOB_ENCOMENDA`), permanecem como próximos incrementos recomendados:

1. **Pagamento recusado/falho e liberação de reserva (HU-10 / HU-11):** o serviço atual (`pagamentoService.processar`) registra apenas aprovação simulada; falta suportar e testar o caminho de recusa/estorno sem bloquear a peça.
2. **Proteção contra força bruta e expiração de token de 15 min (HU-01):** implementar e testar limite de tentativas de login e expiração de token de recuperação de senha.
3. **Testes automatizados do serviço C# de concorrência (`backend/backend/Origem.Concorrencia`):** adicionar projeto de testes automatizados (`xUnit`) para validar reservas e timeouts no serviço de concorrência.
4. **Cobertura E2E de painéis pós-venda em Cypress (`e2e/cypress/e2e/`):** incluir cenários na interface web para gestão de pedidos do artesão (HU-14), curadoria/moderação no painel admin (HU-16), avaliação pós-compra (HU-19) e suporte (HU-22/HU-23).
