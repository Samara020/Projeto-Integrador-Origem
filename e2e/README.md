# Suíte de Testes End-to-End (E2E) — Marketplace Origem

Suíte de testes de ponta a ponta desenvolvida em **Cypress** para validar os fluxos completos do marketplace **Origem** contra frontend Next.js, backend Node.js real e banco de dados PostgreSQL, sem qualquer uso de Fake API ou mocks estáticos de negócio.

---

## 1. Configuração por Variáveis de Ambiente e Bloqueio Incondicional

A suíte aponta dinamicamente para o ambiente de execução através de variáveis de ambiente:

| Variável | Padrão | Descrição |
|---|---|---|
| `CYPRESS_BASE_URL` (ou `CYPRESS_baseUrl`) | `http://localhost:3200` | URL do frontend em execução no ambiente descartável (Allowlist: `localhost:3200`, `127.0.0.1:3200`) |
| `CYPRESS_API_URL` (ou `NEXT_PUBLIC_API_URL`) | `http://localhost:4200` | URL do backend real em execução no ambiente descartável (Allowlist: `localhost:4200`, `127.0.0.1:4200`) |
| `TEST_DATABASE_NAME` | *(Obrigatório)* | Nome exato do banco de testes descartável retornado pelo backend (`SELECT current_database()`) |
| `ADMIN_INVITE_CODE` | `origem-admin-2026` | Código de convite para registro de administrador nas fixtures |

> [!IMPORTANT]
> **Bloqueio de segurança e Allowlist de Origens**: A configuração do Cypress (`cypress.config.js`) e o arquivo de suporte (`support/e2e.js`) bloqueiam incondicionalmente qualquer execução fora da allowlist estrita de origens descartáveis autorizadas (`http://localhost:3200`, `http://127.0.0.1:3200` para frontend; `http://localhost:4200`, `http://127.0.0.1:4200` para backend). Qualquer apontamento para o ambiente principal (`:3000` ou `:4000`) ou origens não autorizadas é abortado imediatamente sem override. Adicionalmente, um interceptor global de rede bloqueia requisições do frontend se este tentar disparar chamadas para `:3000` ou `:4000`.

---

## 2. Fixtures Sintéticas, Escrita Real e Trava de Execução (Execution Guard)

> [!WARNING]
> **Atenção sobre escrita real no banco e ausência de idempotência**: Os testes Cypress realizam escrita real no banco de dados (`POST /auth/register`, `POST /produtos`, `PUT .../validacao`, `PUT .../estoque`, `POST /pedidos/checkout`). **A suíte NÃO é idempotente e NÃO executa reset/cleanup automático das tabelas**; ela depende integralmente da reciclagem/recriação do banco de dados descartável pelo harness de testes.

- **DB Owner e Isolamento**: Os testes destinam-se exclusivamente à instância PostgreSQL descartável provisionada especificamente para o runtime de testes conforme o manifesto oficial da coordenação.
- **Trava de Execução Fechada (Execution Guard)**: A suíte mantém sua guarda de execução estritamente fechada antes de qualquer teste via hook global em `support/e2e.js`: realiza uma consulta de preflight em `GET /__test/identity` no backend alvo e **aborta imediatamente a execução** se:
  1. A variável `TEST_DATABASE_NAME` não estiver configurada no ambiente.
  2. O backend não responder HTTP 200 com `environment === "test"`.
  3. O campo `database` retornado pelo backend (obtido via `SELECT current_database()`) não coincidir exatamente com `TEST_DATABASE_NAME`, ou contiver `prod`, `dev` ou for `origem`.
- **Isolamento de Operações em Disco**: Nenhuma exclusão ou escrita de arquivo de aviso/relatório ocorre antes da aprovação do preflight. A limpeza de `e2e-avisos.txt` só é disparada via `cy.task("limparAvisos")` após confirmação segura da identidade do banco.
- **Geração Dinâmica de Fixtures**:
  - `cy.registrarUsuario(papel)`: cria usuários únicos sintéticos via API real com timestamps (`Date.now()`).
  - `cy.criarProdutoAprovado(overrides)`: registra um artesão sintético, cadastra a peça (`POST /produtos`), registra um admin sintético e aprova a peça via endpoint administrativo real (`PUT /produtos/admin/produtos/:id/validacao`).
  - `cy.visitarComo(papel, url)`: injeta sessão JWT real no `localStorage` antes da montagem da página.
  - `cy.hidratado()`: valida a hidratação completa do React antes de interações com o DOM.
- **Exigência de Build da UI com NEXT_PUBLIC_API_URL**:
  O frontend Next.js deve ser compilado e executado com `NEXT_PUBLIC_API_URL` estritamente idêntico ao `CYPRESS_API_URL` (padrão: `http://localhost:4200`). O interceptor do Cypress verifica e barra em tempo de execução qualquer chamada da UI direcionada para portas incorretas.

---

## 3. Matriz de Casos de Teste do Inventário Oficial

Mapeamento contra o inventário oficial de casos de teste (`docs/relatorios/2026-11-17-inventario-testes.json` e plano da disciplina):

| Caso | Arquivo de Teste | Descrição no Inventário Oficial |
|---|---|---|
| **TC01** | `cypress/e2e/acesso.cy.js` | Login com dados válidos: autenticação com sucesso e direcionamento para a área correspondente ao perfil (Comprador, Artesão, Administrador). |
| **TC02** | `cypress/e2e/cadastro-peca.cy.js` | Cadastro de produto com dados obrigatórios pelo artesão e persistência no estoque do painel. |
| **TC03** | `cypress/e2e/vitrine.cy.js` | Exibição de produtos disponíveis: exibição de peças ativas na vitrine, busca por termo no cabeçalho e detalhe do produto. |
| **TC05** | `cypress/e2e/vitrine.cy.js`, `cypress/e2e/compra.cy.js` | Validação da disponibilidade de estoque: peça vendida não pode ser adicionada e checkout com estoque insuficiente recebe 409 do endpoint real `/pedidos/checkout`. |
| **TC06** | `cypress/e2e/compra.cy.js` | Finalização da compra: fluxo completo de checkout, frete dinâmico, pagamento Pix/cartão e histórico com pedido PAGO. |
| **TC08** | `cypress/e2e/acesso.cy.js` | Controle de acesso conforme perfil (RBAC): validação de permissões estritas para cada papel de usuário. |
| **TC09** | `cypress/e2e/desempenho.cy.js` | Tempo de resposta das consultas: 10 medições cronometradas dentro da fila do Cypress para catálogo, busca e detalhe do produto, com dados funcionais da fixture (Plano 1.4: média <= 2000ms, máximo <= 4000ms). |
| **TC10** | `cypress/e2e/compra.cy.js` | Validação de dados de entrega e frete dinâmico com transportadora real. |
| **TC11** | `cypress/e2e/acesso.cy.js` | Login com credenciais inválidas: rejeição de senha incorreta e validação de campos vazios no cliente. |
| **TC12** | `cypress/e2e/cadastro-peca.cy.js` | Cadastro de produto sem campos obrigatórios e validação de tamanho mínimo de descrição (20 caracteres). |
| **TC13** | `cypress/e2e/compra.cy.js` | Prevenção de pedidos duplicados em duplo clique concorrente nas ações de checkout e pagamento. |
| **TC14** | `cypress/e2e/acesso.cy.js` | Controle de acesso administrativo: comprador logado impedido de abrir a área de administrador (`/painel/admin`). |
| **TC17** | `cypress/e2e/acesso.cy.js` | Aprovação, reprovação e auditoria da autenticidade: validação administrativa real (`PUT /produtos/admin/produtos/:id/validacao`) com ativação do status e selo. |
| **TC18** | `cypress/e2e/vitrine.cy.js` | Detalhes do produto, perfil público do artesão associado e navegação com filtros combinados. |
| **TC19** | `cypress/e2e/compra.cy.js` | Persistência, quantidades, valores e disponibilidade do carrinho (inclusive após `cy.reload()`). |
| **TC20** | `cypress/e2e/compra.cy.js` | Consistência de estoque: tentativa de checkout com estoque zerado no backend real retorna HTTP 409 em `POST /pedidos/checkout`, preservando os itens no carrinho. |

---

## 4. Matriz de Cobertura dos Critérios do Card #18 (Trello)

Mapeamento específico contra os critérios de homologação do Card #18:

| Critério Card 18 | Escopo e Verificação nos Testes |
|---|---|
| **Critério 01** | Configuração da URL base da API por variável de ambiente (`CYPRESS_API_URL` / `NEXT_PUBLIC_API_URL`), validada por preflight e interceptors. |
| **Critério 04** | Listagem da vitrine e catálogo integrada aos filtros por origem, região e categorias (`vitrine.cy.js`). |
| **Critério 06** | Perfis dos artesãos e produtos associados carregados dinamicamente via API real (`vitrine.cy.js`). |
| **Critério 07** | Cadastro, login e sessão do usuário integrados aos endpoints reais com JWT (`acesso.cy.js` e `compra.cy.js`). |
| **Critério 08** | Integração do carrinho com persistência dos itens e alteração atômica via `PUT /carrinho/itens/:produtoId` (`compra.cy.js`). |
| **Critério 09** | Finalização da compra na API de pedidos (`POST /pedidos/checkout`) e apresentação de confirmação com ID (`compra.cy.js`). |
| **Critério 10** | Painéis do comprador, artesão e administrador adaptados a endpoints e permissões (`acesso.cy.js`). |
| **Critério 11** | Tratamento de carregamento, erros HTTP, sessões expiradas (`/entrar?motivo=sessao-expirada&volta=...`) e respostas vazias (`acesso.cy.js` e `vitrine.cy.js`). |
| **Critério 14** | Persistência das alterações no banco e no navegador após novas consultas e reload (`compra.cy.js`). |
| **Critério 15** | Testes e documentação dos services atualizados contra o contrato real da API. |

---

## 5. Instruções de Execução

Instale as dependências (dentro da pasta `e2e/`):
```bash
cd e2e
npm install
```

Execução em modo headless apontando para o ambiente descartável:
```bash
TEST_DATABASE_NAME=origem_card18_test \
CYPRESS_BASE_URL=http://localhost:3200 \
CYPRESS_API_URL=http://localhost:4200 \
ADMIN_INVITE_CODE=origem-admin-convite-teste \
npm test
```

O `TEST_DATABASE_NAME` é obrigatório: o preflight aborta antes dos specs se o backend não confirmar esse nome
exato em `GET /__test/identity`. Use somente um banco descartável e recriável; os specs gravam dados sintéticos.

Execução de suítes específicas:
```bash
npx cypress run --spec cypress/e2e/vitrine.cy.js
npx cypress run --spec cypress/e2e/compra.cy.js
npx cypress run --spec cypress/e2e/acesso.cy.js
npx cypress run --spec cypress/e2e/desempenho.cy.js
npx cypress run --spec cypress/e2e/cadastro-peca.cy.js
```

---

## 6. Pré-requisitos para Execução em Ambiente Descartável

Para a homologação integrada dos critérios dependentes de runtime (critérios 4, 6, 7, 9 e 14 do Card #18):
1. **Frontend**: Compile em `frontend/` com `NEXT_PUBLIC_API_URL=http://localhost:4200 npm run build`. Como `next.config.ts` gera `output: "standalone"`, copie os assets para o diretório do servidor standalone antes de iniciar:
   ```bash
   server=$(find .next/standalone -maxdepth 4 -name server.js -print -quit)
   test -n "$server"
   server_dir=$(dirname "$server")
   mkdir -p "$server_dir/.next"
   cp -a .next/static "$server_dir/.next/"
   cp -a public "$server_dir/"
   PORT=3200 HOSTNAME=127.0.0.1 node "$server"
   ```
   O servidor standalone serve o frontend de teste em `http://127.0.0.1:3200`; `npm start` não deve ser usado para essa configuração.
2. **Backend**: Executando o commit branch-exato com migrações aplicadas (`prisma migrate deploy` em porta dedicada `:4200`).
3. **Banco de Dados**: Instância PostgreSQL descartável isolada (ex: porta `:5433`).
4. **Sem uso de dados ou containers principais**: Os testes não devem ser disparados contra `:3000/:4000` nem contra o banco principal.
