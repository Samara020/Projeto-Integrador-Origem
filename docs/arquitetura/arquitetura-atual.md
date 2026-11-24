# Arquitetura atual do Origem

## 1. Visão geral

O Origem possui diferentes componentes responsáveis pela interface, regras de negócio, persistência de dados e funcionalidades auxiliares.

A arquitetura identificada no repositório contém:

- **Frontend:** aplicação Next.js com React e TypeScript.
- **Backend principal:** API desenvolvida com Node.js, Express e TypeScript.
- **Banco de dados:** PostgreSQL.
- **Persistência:** Prisma ORM, utilizado pelo backend para acessar o PostgreSQL.
- **Módulo de IA:** serviço desenvolvido em Python (BentoML), utilizado pelo backend no fluxo de recomendações quando configurado.
- **Módulo de concorrência:** demonstração independente desenvolvida com ASP.NET Core e .NET 10.

## 2. Frontend

O frontend está localizado em `frontend/` e utiliza Next.js, React e TypeScript.

A comunicação HTTP é centralizada em:

`frontend/src/lib/http.ts`

Esse módulo utiliza Axios e define a URL base por meio da variável `NEXT_PUBLIC_API_URL` (no navegador) ou `API_BASE_URL` / `BACKEND_URL` / `NEXT_PUBLIC_API_URL` (no servidor), apontando por padrão para `http://localhost:4000` (API Express).

As rotas de Fake API e os arquivos de `mocks/` foram removidos do frontend; toda a comunicação de domínio é direcionada ao backend real.

O cliente HTTP também recupera a sessão armazenada localmente e, quando existe token JWT válido, adiciona o cabeçalho `Authorization` às requisições.

## 3. Backend principal

O backend está localizado em `backend/app/` e utiliza Node.js, Express e TypeScript.

O arquivo `src/index.ts` configura a aplicação Express, middlewares, rota de saúde, rotas da aplicação e tratamento global de erros.

As rotas são organizadas por domínio em `src/routes/`, incluindo:

- Autenticação;
- Produtos;
- Artesãos;
- Carrinho;
- Pedidos;
- Pagamentos;
- Avaliações;
- Suporte;
- Painel;
- Catálogo;
- Demonstração.

A organização interna também possui controllers, services e repositories, separando responsabilidades de entrada HTTP, regras de negócio e acesso aos dados.

## 4. Banco de dados e Prisma

O banco de dados utilizado é PostgreSQL.

O Prisma está configurado em `backend/app/prisma/schema.prisma`, com a URL de conexão obtida pela variável `DATABASE_URL`.

O cliente Prisma é centralizado em:

`backend/app/src/lib/prisma.ts`

O schema Prisma mapeia as tabelas existentes no banco. A documentação do próprio schema informa que a estrutura é criada por scripts SQL, e não pelo fluxo convencional de migrations do Prisma.

Os scripts SQL ficam em `database/sql/`.

O arquivo `backend/app/src/lib/setup-db.ts` permite preparar o banco quando `AUTO_SETUP_DB=true`. Nesse caso, verifica a existência das tabelas e executa os scripts SQL de criação, integridade e índices. O seed é executado quando não existem usuários cadastrados.

**Atenção:** embora o `package.json` possua um script chamado `prisma:push`, o schema informa que não se deve utilizar `prisma db push` nas tabelas atuais.

## 5. Módulo de IA

O repositório contém o diretório `modulo-ia/`, com implementação em Python (BentoML).

O fluxo de recomendações é atendido pelo backend Express em `GET /produtos/recomendacoes` (`backend/app/src/services/produto.service.ts`).

Quando `RECOMENDACAO_API_URL` está configurada no backend, o serviço consulta `POST /recommendations` no módulo de IA (com timeout de 2 s) e filtra apenas peças disponíveis e aprovadas no PostgreSQL; se não estiver disponível, utiliza o baseline real sobre o catálogo do PostgreSQL.

## 6. Módulo de concorrência

O diretório `backend/backend/Origem.Concorrencia/` contém uma aplicação independente desenvolvida com ASP.NET Core e .NET 10.

Ela demonstra o controle de compras concorrentes de um produto com estoque limitado.

A implementação utiliza:

- Controle de concorrência com `lock`;
- Identificação de tentativas por `tentativaId`;
- Fila em memória;
- Processamento de notificações por `BackgroundService`.

O estado demonstrativo é mantido em memória e não possui persistência no banco de dados. A demonstração possui endpoints próprios, como `/demo/compras`.

A API é acionada diretamente por cliente HTTP externo (como o script `backend/testar-demo.ps1`) no fluxo demonstrativo do produto `prd_201`, sem integração no código de `frontend/src/`.

Esse módulo deve ser considerado uma demonstração independente, e não parte comprovada do backend Express principal.

## 7. Infraestrutura e execução

O repositório contém arquivos de configuração e execução, como:

- `compose.yaml`;
- `.env.example`;
- `database/`;
- `scripts/`;
- `backend/`;
- `frontend/`;
- `modulo-ia/`.

Esses elementos apoiam a configuração e execução dos componentes do projeto.

## 8. Considerações arquiteturais

O frontend comunica-se exclusivamente com o backend Express (`NEXT_PUBLIC_API_URL`, padrão `http://localhost:4000`), que persiste os dados no PostgreSQL via Prisma ORM e consulta opcionalmente o módulo de IA (`RECOMENDACAO_API_URL`). A demonstração de concorrência em C# permanece como serviço separado para o fluxo demonstrativo.
