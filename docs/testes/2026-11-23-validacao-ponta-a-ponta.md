# Relatório de Validação Ponta a Ponta (E2E) — Sistema Origem

**Data:** 23/11/2026  
**Branch:** `main`  
**Commit base avaliado:** `1a46831`  
**Objetivo:** validar a aplicação Origem de ponta a ponta (Frontend Next.js + Backend Express/Prisma + PostgreSQL 17 + Módulo de IA BentoML), executar as suítes integradas que estavam bloqueadas/puladas no relatório anterior (`2026-11-22-execucao-testes-automatizados.md`), revisar logs, corrigir defeitos reais encontrados e consolidar as evidências finais.

---

## 1. Ambiente Integrado

| Componente | Endpoint / Porta | Runtime / Imagem |
|---|---|---|
| Frontend | `http://localhost:3000` | Next.js `16.4.6` + React 19 (`origem-frontend`) |
| Backend principal | `http://localhost:4000` | Node `24-slim`, Express + Prisma `5.22.0` (`origem-backend`) |
| Banco de dados | `localhost:5433` (interno `5432`) | PostgreSQL `17` (`origem-postgres`, banco `origem_db` e banco descartável `origem_test` criado apenas durante a suíte do backend e removido ao final) |
| Módulo de IA | `http://localhost:3001` | Python `3.13.18` + BentoML `1.4.39` (`origem-modulo-ia`) |
| Host de execução | Windows (PowerShell) | Node `v24.19.0`, npm `11.17.0` |

---

## 2. O Que Já Estava Coberto Anteriormente

Validado no commit `1a46831` e documentado em [`2026-11-22-execucao-testes-automatizados.md`](./2026-11-22-execucao-testes-automatizados.md):

- **Frontend unitário (`npm --prefix frontend run test:unit`):** 14/14 suítes, **203/203 aprovados** (reconfirmado hoje em 8,14 s após ajuste em `recomendacoes-integracao.test.ts`).
- **Backend unitário (`npm --prefix backend/app run test:unit`):** 4/4 suítes, **80/80 aprovados** (incluído também na rodada completa de 12 suítes abaixo).
- **Módulo de IA (`pytest` no container `origem-modulo-ia`):** 4/4 arquivos, **27/27 aprovados**.
- **Testes de API integrados (`npm --prefix frontend run test:api`):** 8/8 suítes ativas, **61/61 aprovados** (`auth`, `produtos`, `catalogo`, `admin`, `recomendacoes`, `modulo-ia`, `fluxos-integrados`, `fluxos-criticos`).

---

## 3. Novas Validações Executadas Nesta Rodada

### 3.1. Suíte Completa de Integração do Backend com PostgreSQL (`npm --prefix backend/app test`)

Executada contra banco descartável isolado `origem_test` criado em `origem-postgres` com `01_create_tables.sql`, `02_integrity_rules.sql`, `04_create_indexes.sql` e migrações idempotentes `07` e `08` aplicadas pelo `tests/setup.ts`.

- **1ª execução (diagnóstico):** 10/12 suítes aprovadas, 2 reprovadas (`171 aprovados, 4 reprovados`, 40,47 s). Revelou **3 defeitos críticos reais** no backend (Seção 4).
- **2ª execução (após correções):** **12/12 suítes aprovadas · 175/175 testes aprovados (58,03 s)**:
  - `tests/pedidos.test.ts` — **Aprovado** (checkout, lock `FOR UPDATE` no carrinho com re-leitura de preço/quantidade, estoque insuficiente `409`, cancelamento concorrente, lock de status final, proteção de pedido multiloja).
  - `tests/integracao-persistencia.test.ts` — **Aprovado** (prevenção de pedidos duplicados em checkouts simultâneos, frete calculado no servidor, pagamento concorrente idempotente, token de recuperação de uso único concorrente, perfil admin/artesão, suporte e personalização).
  - `tests/seguranca-regressao.test.ts` — **Aprovado** (auditorias 1 a 5, revogação persistente de sessão no logout e após redefinição de senha entre instâncias).
  - `tests/auth.test.ts` — **Aprovado** (cadastro, login, migração de hash, logout com bloqueio `401`).
  - `tests/auth-permissoes.test.ts` — **Aprovado** (RBAC entre perfis).
  - `tests/produtos.test.ts` & `tests/produtos-posse.test.ts` — **Aprovado** (CRUD, peça única, posse de loja `403`, exclusão lógica/física).
  - `tests/artesaos.test.ts`, `tests/produto-service.unit.test.ts`, `tests/recomendacoes.unit.test.ts`, `tests/aed-buscas.test.ts`, `tests/aed-estruturas.test.ts` — **Aprovados**.

### 3.2. Integração Completa de Recomendações (`frontend/tests/api/recomendacoes-integracao.test.ts`)

Comando:
```powershell
$env:BACKEND_URL="http://localhost:4000"; $env:FRONTEND_URL="http://localhost:3000"; $env:IA_BASE_URL="http://localhost:3001"
npm --prefix frontend run test:api -- tests/api/recomendacoes-integracao.test.ts
```

- **1ª execução:** falhou em 6/6 porque o arquivo usava `BASE_URL` (apontado para `:4000` após o Card 18) para buscar páginas do frontend (`/produto/2001`, `/recomendacoes`).
- **2ª execução (após separar `FRONTEND_URL` de `BACKEND_URL`):** **1/1 suíte aprovada · 6/6 testes aprovados (1,56 s)**:
  - Saúde simultânea de `/health` (`:4000`), `/readyz` (`:3001`), `/produto/2001` (`:3000`) e `/recomendacoes` (`:3000`).
  - `GET /produtos/recomendacoes?produtoId=2001&limite=4` consultando a IA com o catálogo real do Postgres, expondo `X-Recomendacao-Fonte: ia` via CORS, excluindo peça `2001` e peça esgotada `2008`, ordenando por score e validando cada ID no catálogo.
  - Recomendações por filtro de técnica (`Cerâmica`), por região (`Agreste - PE`), resposta vazia para critério sem candidatos (`RF-11`) e resposta vazia sem erro `500` para referência inexistente (`999999`).

### 3.3. Validação Ponta a Ponta no Navegador Real (`http://localhost:3000`)

Executada em navegador real contra os 4 containers integrados (`origin` verificado: `http://localhost:3000`, sem bloqueios, 0 erros HTTP 4xx/5xx de API):

| Etapa | Fluxo Validado | Resultado | Evidência Observada |
|---|---|---|---|
| 1 | Vitrine inicial (`/`) | **Aprovado** | 14 peças reais e 6 artesãos carregados do PostgreSQL (*Trio de Aves do Sertão*, *Santo Antônio de Barro*, *Moringa com Caneca*), sem erro de servidor |
| 2 | Busca, filtros e estado vazio (`/catalogo`) | **Aprovado** | Busca `"Barro"` retornou 2 peças reais (*Santo Antônio de Barro* e *Luminária de Barro*); busca `"xyznaoexiste999"` exibiu estado vazio amigável (*"Nenhuma peça com esses filtros"*) |
| 3 | Detalhe do produto + recomendações da IA (`/produto/2001`) | **Aprovado** | *Vaso Cerâmica Raízes* carregado com 4 peças recomendadas válidas (`2013`, `2002`, `2006`, `2007`) sem repetir `2001` |
| 4 | Perfil público do artesão (`/artesao/1006`) | **Aprovado** | Navegação a partir do produto abriu *Ateliê Mãos da Mata* com 5 peças associadas |
| 5 | Cadastro + controle de acesso RBAC (`/cadastro`, `/painel/admin`) | **Aprovado** | Cadastro real de `COMPRADOR` com login automático; tentativa de abrir `/painel/admin` bloqueada com *"Área restrita à administração"* |
| 6 | Compra completa e persistência (`/carrinho`, `/checkout`, `/conta`) | **Aprovado** | Item mantido em `/carrinho` após `reload`; checkout com CEP `50010-000`, frete *Origem Econômico* (`R$ 18,00`) e pagamento **Pix** gerou `PEDIDO #1` (`R$ 178,00`), persistido em `/conta` com status **Pago** |
| 7 | Logout | **Aprovado** | *"Sair da conta"* redirecionou para `/` em estado desconectado (*"Entrar"* e *"Carrinho vazio"*) |

### 3.4. Processamento Assíncrono e Cache (Diagnóstico Arquitetural e Validação)

1. **Processamento assíncrono / mensageria:**
   - **No backend Express principal:** o único envio assíncrono desacoplado é o disparo de e-mail de recuperação de senha em `backend/app/src/lib/email.ts` (SMTP direto com fallback em log `[EMAIL:FALLBACK]` quando `SMTP_HOST` não está configurado e timeout de 10 s para falhas de conexão). Não existe broker de mensageria (RabbitMQ/Kafka/SQS) no `compose.yaml`.
   - **No módulo demonstrativo `backend/backend/Origem.Concorrencia/` (.NET 10):** existe fila em memória (`FilaPedidos` baseada em `Channel<MensagemPedido>` com capacidade 100) e consumidor assíncrono (`ProcessadorPedidos : BackgroundService`) com controle de estado (`ENFILEIRADA` → `PROCESSADA` / `FALHOU`) e retorno `503` em fila cheia. **Restrição de ambiente:** o SDK `.NET` não está instalado no host Windows e o serviço não faz parte do `compose.yaml`; validado por inspeção de código e mantido fora do fluxo principal de produção (conforme `docs/arquitetura/arquitetura-atual.md` e `ADR-003`).
2. **Cache, expiração e atualização após alterações:**
   - **Arquitetura atual:** não existe camada dedicada de cache distribuído (Redis/Memcached) no backend nem no `compose.yaml` (`docs/arquitetura/arquitetura-atual.md`). Todas as leituras consultam diretamente o PostgreSQL via Prisma.
   - **Comportamento validado:** após escrita/alteração (estoque, compra, cancelamento, moderação de avaliação, curadoria), as consultas subsequentes refletem imediatamente o estado atualizado do banco (sem dados obsoletos), confirmado tanto nos testes de API quanto no `reload` do navegador no fluxo E2E.

### 3.5. Revisão de Logs dos Containers

- **`origem-backend-1`:** aplicou `07_suporte_exclusao_logica_produto.sql` e `08_integracao_persistencia.sql` sem erros; nenhuma exceção não tratada durante todo o fluxo E2E.
- **`origem-modulo-ia-1`:** `RecommendationService` respondeu `HTTP 200` em 100% das chamadas `POST /recommendations` com tempo de inferência entre `0,15 ms` e `0,66 ms` (total HTTP `2 ms`–`15 ms`).
- **`origem-frontend-1`:** Next.js `16.4.6` ativo em `:3000` sem erros de SSR/runtime.

---

## 4. Defeitos Encontrados e Corrigidos Nesta Rodada

| ID | Defeito Encontrado | Causa Raiz | Correção Aplicada | Verificação |
|---|---|---|---|---|
| D-01 | **Pedidos duplicados em checkout simultâneo** (`integracao-persistencia.test.ts:82`) e **não re-leitura de preço/quantidade após lock do carrinho** (`pedidos.test.ts:454`) | `pedidoRepository.criarCheckout()` lia itens fora da transação e não adquiria `SELECT id_carrinho FROM carrinho ... FOR UPDATE` | Adicionado lock `FOR UPDATE` na linha do carrinho dentro da transação em `backend/app/src/repositories/pedido.repository.ts`, re-leitura de `itemCarrinho` + `produto.preco` após o lock e rejeição `400` quando vazio | `integracao-persistencia.test.ts` e `pedidos.test.ts` **aprovados** |
| D-02 | **Transição concorrente reabria pedido `CANCELADO` para `ENVIADO`** (`pedidos.test.ts:398`) | `pedidoRepository.atualizarStatus()` não travava a linha do pedido com `FOR UPDATE` nem revalidava `STATUS_FINAIS` dentro da transação | Adicionado `SELECT id_pedidos FROM pedido ... FOR UPDATE` e guarda `409` para `CANCELADO`/`ENTREGUE` dentro da transação em `pedido.repository.ts` | `pedidos.test.ts` **aprovado** |
| D-03 | **Código duplicado e divergência de mensagem em pedido multiloja** (`pedidos.test.ts:451` / `seguranca-regressao.test.ts:74`) | Duas verificações duplicadas de multiloja em `pedido.service.ts` após merge, com textos distintos | Removido bloco duplicado em `backend/app/src/services/pedido.service.ts` e padronizada mensagem única compatível com ambos os contratos | `pedidos.test.ts` e `seguranca-regressao.test.ts` **aprovados** |
| D-04 | **Redefinição de senha com token persistido falhava sob concorrência / alias `senha`** (`integracao-persistencia.test.ts:72`) | `auth.routes.ts` só aceitava `novaSenha` e `auth.service.ts` não consumia tokens persistidos de `recuperacaoRepository` | `auth.routes.ts` passou a aceitar `novaSenha ?? senha`; `auth.service.ts` consome tokens não-JWT atomicamente via `recuperacaoRepository.consumir()` com invalidação de sessões | `integracao-persistencia.test.ts`, `seguranca-regressao.test.ts` e `auth.test.ts` **aprovados** |
| D-05 | **`recomendacoes-integracao.test.ts` falhava ao consultar `/produto/2001` na porta do backend** | Após o Card 18, `BASE_URL` passou a apontar para `:4000`, mas a suíte ainda usava `BASE_URL` para rotas do frontend | Separada `FRONTEND_URL` (`http://localhost:3000`) de `BACKEND_URL` (`http://localhost:4000`) em `frontend/tests/api/recomendacoes-integracao.test.ts` | `recomendacoes-integracao.test.ts` **6/6 aprovado** |

---

## 5. Resumo Final Consolidado

| Verificação | Resultado Final |
|---|---|
| Backend — Suíte completa (integração com PostgreSQL + unitários) | **12/12 suítes · 175/175 aprovados** (`tsc` verde) |
| Frontend — Unitários + Lint | **14/14 suítes · 203/203 aprovados** (`eslint` verde) |
| Frontend — API integrada (Rodada 2 anterior + `recomendacoes-integracao.test.ts` hoje) | **9/9 suítes · 67/67 aprovados** |
| Módulo de IA — Pytest (container) | **4/4 arquivos · 27/27 aprovados** |
| Navegador real ponta a ponta (`http://localhost:3000`) | **7/7 etapas aprovadas** (0 erros HTTP 4xx/5xx de API) |
| Ambiente Docker local ao final da validação | Volume resetado e `backend` reconstruído com as correções (`3` categorias e `14` peças reais limpas) |
