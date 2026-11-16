# Arquitetura atual do Origem

## 1. Visão geral

O Origem possui diferentes componentes responsáveis pela interface, regras de negócio, persistência de dados e funcionalidades auxiliares.

A arquitetura identificada no repositório contém:

- **Frontend:** aplicação Next.js com React e TypeScript.
- **Backend principal:** API desenvolvida com Node.js, Express e TypeScript.
- **Banco de dados:** PostgreSQL.
- **Persistência:** Prisma ORM, utilizado pelo backend para acessar o PostgreSQL.
- **Fake API:** rotas da aplicação Next.js utilizadas para simular respostas da API.
- **Módulo de IA:** serviço desenvolvido em Python, utilizado no fluxo de recomendações quando configurado.
- **Módulo de concorrência:** demonstração independente desenvolvida com ASP.NET Core e .NET 10.

## 2. Frontend

O frontend está localizado em `frontend/` e utiliza Next.js, React e TypeScript.

A comunicação HTTP é centralizada em:

`frontend/src/lib/http.ts`

Esse módulo utiliza Axios e define a URL base por meio da variável:

`NEXT_PUBLIC_API_URL`

Quando essa variável não está configurada, o endereço padrão utilizado é `/api`, direcionando as chamadas para as rotas da Fake API do próprio Next.js.

O cliente HTTP também recupera a sessão armazenada localmente e, quando existe token, adiciona o cabeçalho `Authorization` às requisições.

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

O repositório contém o diretório `modulo-ia/`, com implementação em Python.

O fluxo de recomendações do frontend está em:

`frontend/src/app/api/produtos/recomendacoes/route.ts`

Quando `RECOMENDACAO_API_URL` está configurada, a rota pode consultar o módulo de IA. Caso o serviço não esteja configurado ou não retorne recomendações, é utilizado o mecanismo local de recomendação (`recomendarPara`).

A rota também utiliza resumos de produtos provenientes dos mocks do frontend.

Portanto, esse fluxo não deve ser descrito como uma integração direta entre o módulo de IA e o PostgreSQL.

## 6. Módulo de concorrência

O diretório `backend/backend/Origem.Concorrencia/` contém uma aplicação independente desenvolvida com ASP.NET Core e .NET 10.

Ela demonstra o controle de compras concorrentes de um produto com estoque limitado.

A implementação utiliza:

- Controle de concorrência com `lock`;
- Identificação de tentativas por `tentativaId`;
- Fila em memória;
- Processamento de notificações por `BackgroundService`.

O estado demonstrativo é mantido em memória e não possui persistência no banco de dados. A demonstração possui endpoints próprios, como `/demo/compras`.

O frontend utiliza a variável `NEXT_PUBLIC_CONCORRENCIA_API_URL` para acessar essa API no fluxo específico do produto demonstrativo `prd_201`.

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

A arquitetura possui caminhos distintos de comunicação: o frontend pode utilizar a Fake API ou o backend principal, conforme a configuração de ambiente; as recomendações podem utilizar o módulo de IA ou o mecanismo local; e a demonstração de concorrência utiliza uma API independente.

Essas diferenças precisam ser consideradas ao executar, testar ou evoluir o sistema.
