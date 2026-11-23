# Incompatibilidades Técnicas e Correções · Origem

Registro objetivo da auditoria de compatibilidade entre a arquitetura implementada e a stack da disciplina (Frontend, Backend Node.js, Prisma, PostgreSQL, Módulo de IA e Concorrência).

> **Política de evolução do banco (`ADR-001`):** todas as alterações estruturais do PostgreSQL continuam sendo versionadas em scripts SQL idempotentes em `database/sql/` (aplicados por `backend/app/src/lib/setup-db.ts` e `backend/app/tests/setup.ts`), mantendo `backend/app/prisma/schema.prisma` espelhado ao esquema relacional.

## Resumo da stack verificada

| Camada | Tecnologias efetivas |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Chakra UI 3, `lucide-react`, Axios, Jest, Cypress |
| **Backend principal** | Node.js 20+, Express 4, TypeScript 5, Prisma ORM 5.22, Zod, JWT, `bcryptjs`, Jest + Supertest |
| **Banco de dados** | PostgreSQL 17 (`origem_db`, porta `5433` no host / `5432` no Docker), esquema versionado em `database/sql/` |
| **Módulo de IA** | Python 3.13+, BentoML, Pydantic, `pytest` (integrado ao backend em `GET /produtos/recomendacoes`) |
| **Concorrência (demo)** | C# / .NET 10 (`backend/backend/Origem.Concorrencia`, execução isolada fora do `compose.yaml`, `ADR-003`) |

---

## Incompatibilidades registradas e situação

### 1. Rotas ausentes no backend (`personalizacoes`, `redefinir-senha` e suporte) — **Resolvida**
- **Onde ocorria:** `frontend/src/services/personalizacao.ts`, `auth.ts` e `suporte.ts` vs. `backend/app/src/routes/`.
- **Resolução:** Endpoints implementados e persistidos no PostgreSQL via `database/sql/08_integracao_persistencia.sql` e Prisma (`Personalizacao`, `RecuperacaoSenha`, `Ticket`, `TicketMensagem`).
- **Commits de referência:** `5bda764`, `f8a04c2`.

### 2. Testes unitários legados da AV1 e CI sem backend — **Resolvida**
- **Onde ocorria:** `frontend/tests/unit/` e `.github/workflows/testes.yml`.
- **Resolução:** Suítes unitárias do frontend alinhadas ao backend real e workflow de CI atualizado para subir backend + PostgreSQL + módulo de IA + frontend.
- **Commits de referência:** `5bda764`, `f8a04c2`, `0d2486c`.

### 3. Duplicidade e versões divergentes do Prisma no repositório — **Resolvida**
- **Onde ocorria:** `backend/app/package.json` (Prisma `5.22.0`) vs. `prisma-validacao/package.json` (Prisma `6.19.3`).
- **Resolução:** Pasta auxiliar duplicada `prisma-validacao/` removida; `backend/app/prisma/schema.prisma` permanece como fonte única.
- **Commit de referência:** `b99d1d7`.

### 4. Dependência proibida não utilizada no frontend — **Resolvida**
- **Onde ocorria:** `frontend/package.json` (`react-icons`) vs. `frontend/DESIGN.md`.
- **Resolução:** Pacote `react-icons` removido de `frontend/package.json` e `frontend/package-lock.json`, mantendo apenas `lucide-react`.
- **Commit de referência:** `b99d1d7`.

### 5. Documentação de stack e IDs da demo de concorrência desalinhados — **Resolvida**
- **Onde ocorria:** `README.md` (seção *Stack*) e `backend/backend/Origem.Concorrencia/Program.cs`.
- **Resolução:** Seção *Stack* do `README.md` atualizada e `Origem.Concorrencia/Program.cs` ajustado para aceitar tanto `prd_201` quanto `2001`.
- **Commit de referência:** `b99d1d7`.

### 6. Desalinhamento entre `schema.prisma` e `database/sql/08_integracao_persistencia.sql` — **Resolvida**
- **Onde ocorria:** colunas de `produto` (`sku`, `material`, `dimensoes`, `peso`, `certificado`, `informacoes_origem`, `prazo_producao_dias`, `capacidade_producao`) existiam em `schema.prisma`, mas faltavam em `database/sql/08_integracao_persistencia.sql`, gerando `PrismaClientKnownRequestError (P2022)` ao subir o Docker Compose.
- **Resolução:** Colunas adicionadas de forma idempotente em `database/sql/08_integracao_persistencia.sql` (respeitando o `ADR-001`), além da extração de `recomendacao.service.ts` e criação de `jest.unit.config.ts`.
- **Commit de referência:** `b33614c`.

### 7. Filtro `origem`, validação de curadoria e travas de concorrência em pedidos — **Resolvida**
- **Onde ocorria:** `produto.service.ts` ignorava `origem` e aceitava reprovação sem justificativa; `pedido.repository.ts` havia perdido travas `FOR UPDATE` em `criarCheckout` e `atualizarStatus`; `auth.service.ts` não consumia atomicamente tokens persistidos em `recuperacao_senha`.
- **Resolução:** Filtro `origem` e justificativa obrigatória corrigidos; travas `FOR UPDATE` restauradas em checkout e transição de status; consumo atômico de token persistido integrado em `auth.service.ts`; formulários de nova peça corrigidos para categoria inicial e campos decimais.
- **Commits de referência:** `1a46831`, `bd48c92`, `ca0b19e` (e validação E2E registrada em `docs/testes/2026-11-23-validacao-ponta-a-ponta.md`).

### 8. Curadoria/selo e moderação de avaliações em memória (`memoria.ts`) — **Resolvida**
- **Onde ocorria:** `backend/app/src/lib/memoria.ts` ainda era importado em `produto.service.ts`, `recomendacao.service.ts` e arquivos de teste como espelho volátil de `validacoes` e `avaliacoesRemovidas`.
- **Resolução:** Arquivo `backend/app/src/lib/memoria.ts` removido completamente; toda curadoria (`status_validacao`, `selo_ativo`, `justificativa_validacao`, `decidido_em`, `decidido_por_id`) e moderação (`avaliacao.status`, `motivo`, `sinalizada_em`, `moderada_em`) utilizam exclusivamente as colunas persistidas no PostgreSQL (`database/sql/08_integracao_persistencia.sql`, conforme `ADR-001`).
- **Commit de referência:** entrega atual de fechamento da auditoria de arquitetura e stack.

### 9. Acessos diretos ao Prisma na camada `services/` — **Resolvida**
- **Onde ocorria:** `artesao.service.ts`, `avaliacao.service.ts`, `carrinho.service.ts`, `painel.service.ts`, `personalizacao.service.ts` e `suporte.service.ts` importavam `prisma` diretamente.
- **Resolução:** Todas as consultas e transações Prisma foram movidas para `backend/app/src/repositories/` (`admin.repository.ts`, `avaliacao.repository.ts`, `carrinho.repository.ts`, `loja.repository.ts`, `personalizacao.repository.ts`, `produto.repository.ts`, `ticket.repository.ts`, `usuario.repository.ts`), restaurando a separação estrita em camadas (`routes -> controllers -> services -> repositories -> Prisma`).
- **Commit de referência:** entrega atual de fechamento da auditoria de arquitetura e stack.

### 10. Normalização/reescrita de prefixos de rota no cliente HTTP (`http.ts`) — **Resolvida**
- **Onde ocorria:** `frontend/src/lib/http.ts` (`normalizarCaminhoBackend`) reescrevia rotas canônicas (`/admin/produtos/*`, `/artesao/pecas*`, `/admin/perfil`, `/admin/painel/*`, `/artesao/painel/*`, `/artesao/envio/*`, `/envios/*`, `/admin/avaliacoes*`, `/produtos/:id/avaliacoes`) para prefixos internos do Express.
- **Resolução:** Rotas canônicas do `docs/ContratoDeAPI.md` montadas diretamente na raiz `/` em `backend/app/src/routes/index.ts` (`rotasDiretasProdutos`, `rotasDiretasAvaliacoes`, `painelRoutes`, mantendo os prefixos legados como aliases compatíveis) e função `normalizarCaminhoBackend` removida de `frontend/src/lib/http.ts`. Documentação sincronizada em `docs/ContratoDeAPI.md` e `docs/arquitetura/fluxo-comunicacao.md`.
- **Commit de referência:** entrega atual de fechamento da auditoria de arquitetura e stack.
