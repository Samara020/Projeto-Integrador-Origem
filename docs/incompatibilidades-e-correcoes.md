# Incompatibilidades Técnicas e Correções · Origem

Registro objetivo da auditoria de compatibilidade entre a arquitetura implementada e a stack da disciplina (Frontend, Backend Node.js, Prisma, PostgreSQL, Módulo de IA e Concorrência).

## Resumo da stack verificada

| Camada | Tecnologias efetivas |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Chakra UI 3, `lucide-react`, Axios, Jest, Cypress |
| **Backend principal** | Node.js 20+, Express 4, TypeScript 5, Prisma ORM 5.22, Zod, JWT, `bcryptjs`, Jest + Supertest |
| **Banco de dados** | PostgreSQL 17 (`origem_db`, porta `5433` no host / `5432` no Docker) |
| **Módulo de IA** | Python 3.13+, BentoML, Pydantic, `pytest` (integrado ao backend em `GET /produtos/recomendacoes`) |
| **Concorrência (demo)** | C# / .NET 10 (`backend/backend/Origem.Concorrencia`, execução isolada fora do `compose.yaml`) |

---

## Incompatibilidades registradas e situação

### 1. Rotas ausentes no backend (`personalizacoes`, `redefinir-senha` e suporte) — **Resolvida**
- **Onde ocorria:** `frontend/src/services/personalizacao.ts`, `auth.ts` e `suporte.ts` vs. `backend/app/src/routes/`.
- **Resolução:** Endpoints implementados e persistidos via Prisma na `main` (`Personalizacao`, `RecuperacaoSenha`, `Ticket`, `TicketMensagem` — integração do Card 18).

### 2. Testes unitários legados da AV1 e CI sem backend — **Resolvida**
- **Onde ocorria:** `frontend/tests/unit/` e `.github/workflows/testes.yml`.
- **Resolução:** Suítes unitárias do frontend alinhadas ao backend real e pipeline `.github/workflows/testes.yml` atualizado para compilar e subir backend + PostgreSQL + módulo de IA + frontend (integração do Card 18).

### 3. Duplicidade e versões divergentes do Prisma no repositório — **Resolvida**
- **Onde ocorria:** `backend/app/package.json` (Prisma `5.22.0`) vs. `prisma-validacao/package.json` (Prisma `6.19.3`).
- **Resolução:** Pasta auxiliar duplicada `prisma-validacao/` removida; `backend/app/prisma/schema.prisma` permanece como fonte única.

### 4. Dependência proibida não utilizada no frontend — **Resolvida**
- **Onde ocorria:** `frontend/package.json` (`react-icons`) vs. `frontend/DESIGN.md`.
- **Resolução:** Pacote `react-icons` removido de `frontend/package.json` e `frontend/package-lock.json`, mantendo apenas `lucide-react`.

### 5. Documentação de stack e IDs da demo de concorrência desalinhados — **Resolvida**
- **Onde ocorria:** `README.md` (seção *Stack*) e `backend/backend/Origem.Concorrencia/Program.cs`.
- **Resolução:** Seção *Stack* do `README.md` atualizada (Tailwind CSS 4, `lucide-react`, Axios) e `Origem.Concorrencia/Program.cs` atualizado para aceitar tanto `prd_201` (Fake API) quanto `2001` (PostgreSQL).

### 6. Normalização de prefixos de rota no cliente HTTP — **Mapeada (melhoria futura)**
- **Onde ocorre:** `frontend/src/lib/http.ts` (`normalizarCaminhoBackend`) vs. `backend/app/src/routes/index.ts`.
- **Situação:** O frontend ainda reescreve prefixos de algumas rotas (`/admin/produtos/*`, `/painel/*`, `/avaliacoes/*`) para manter compatibilidade com os prefixos montados no Express.
- **Correção proposta:** Montar as rotas canônicas do `docs/ContratoDeAPI.md` diretamente na raiz do Express (com aliases legados) e remover `normalizarCaminhoBackend` em uma tarefa coordenada com a suíte E2E.

### 7. Curadoria/selo e moderação de avaliações em memória — **Mapeada (melhoria futura)**
- **Onde ocorre:** `backend/app/src/lib/memoria.ts` (`validacoes`, `avaliacoesRemovidas`).
- **Situação:** Tickets, personalizações e recuperação de senha já foram migrados para o Prisma; apenas decisões de validação de origem (`seloAtivo`) e moderação de avaliações ainda permanecem em memória.
- **Correção proposta:** Criar tabelas SQL + migração Prisma para `validacao_produto` e `moderacao_avaliacao` quando a equipe consolidar o schema final.
