# Fluxo de comunicação

## 1. Comunicação entre frontend e backend

O frontend centraliza as requisições HTTP em `frontend/src/lib/http.ts`, utilizando Axios.

A URL base é definida por `NEXT_PUBLIC_API_URL`.

- Quando configurada, as chamadas são direcionadas ao endereço informado.
- Quando não configurada, o valor padrão é `/api`, utilizado pelas rotas da Fake API do Next.js.

O cliente HTTP recupera a sessão armazenada localmente e adiciona o cabeçalho `Authorization` quando existe um token.

## 2. Exemplo real: listagem de produtos

O exemplo utiliza a rota GET `/produtos`, implementada em `backend/app/src/routes/produtos.routes.ts`.

### 2.1. Requisição HTTP

Exemplo de chamada direta ao backend Express:

    GET http://localhost:4000/produtos?pagina=1&limite=10

A rota também aceita os seguintes filtros:

| Parâmetro | Finalidade |
|---|---|
| termo | Pesquisa pelo nome do produto |
| categoria | Filtra pela categoria |
| tecnica | Filtra pela técnica utilizada |
| regiao | Filtra pela origem/região |
| pagina | Define a página da listagem |
| limite | Define a quantidade de registros |

Os parâmetros de paginação possuem valores padrão: página 1 e limite 10. O limite é restringido a no máximo 50 registros pelo service.

### 2.2. Recebimento pelo Express

O arquivo `backend/app/src/index.ts` configura:

- Helmet;
- CORS;
- Parser JSON;
- Middleware `idsComoTexto`;
- Rota de saúde `/health`;
- Rotas da aplicação;
- Middleware global de erros.

A função `montarRotas(app)` registra os endpoints da aplicação.

Em `backend/app/src/routes/index.ts`, as rotas de produtos são registradas com o prefixo `/produtos`.

### 2.3. Rota e controller

A rota GET `/` do arquivo `produtos.routes.ts` encaminha a requisição para `ProdutosController.listar()`.

O controller chama:

    produtoService.listar(req.query)

Depois, organiza a resposta com os campos:

- total;
- pagina;
- limite;
- itens.

### 2.4. Service

O método `produtoService.listar()`:

1. Recebe os filtros da requisição.
2. Define os valores de paginação.
3. Chama `produtoRepository.listar()`.
4. Converte o preço para número.
5. Organiza os dados do artesão, região e modalidade de produção.
6. Define a imagem principal ou utiliza uma imagem de placeholder.
7. Retorna a estrutura preparada para a resposta HTTP.

### 2.5. Repository e Prisma

O método `produtoRepository.listar()`:

1. Monta os filtros da consulta.
2. Exclui produtos que não estejam aprovados conforme o estado de validação mantido em memória.
3. Calcula a paginação.
4. Executa `prisma.$transaction()` com duas operações:
   - `prisma.produto.count()`, para contar os registros;
   - `prisma.produto.findMany()`, para buscar os produtos da página.

A consulta inclui categoria, loja, usuário, estoque e a primeira imagem de cada produto.

### 2.6. PostgreSQL

O Prisma executa as operações no PostgreSQL utilizando a conexão definida por `DATABASE_URL`.

Os dados são retornados ao repository, depois ao service e ao controller.

### 2.7. Exemplo de resposta JSON

A estrutura real retornada pelo controller é:

    {
      "total": 0,
      "pagina": 1,
      "limite": 10,
      "itens": [
        {
          "id": 0,
          "nome": "Nome do produto",
          "preco": 0,
          "imagemPrincipal": "URL da imagem",
          "artesao": {
            "id": "identificador",
            "nome": "Nome do artesão"
          },
          "seloAtivo": false,
          "regiao": {
            "id": "origem",
            "nome": "origem"
          },
          "modalidadeProducao": "PRONTA_ENTREGA",
          "disponibilidade": "DISPONIVEL"
        }
      ]
    }

Os valores são ilustrativos. A quantidade de registros, os identificadores e os dados dependem do conteúdo do banco.

### 2.8. Tratamento de erros

O middleware `backend/app/src/middleware/error.ts` centraliza o tratamento de erros.

- Erros do tipo `ErroApp` retornam o status definido e uma mensagem JSON.
- Erros inesperados são registrados no console e retornam HTTP 500 com a mensagem `Erro interno do servidor.`.

## 3. Fluxo resumido

Frontend
→ Cliente HTTP Axios
→ API Express
→ Middleware
→ Rota de produtos
→ ProdutosController
→ produtoService
→ produtoRepository
→ Prisma Client
→ PostgreSQL

A resposta percorre o caminho inverso até chegar ao cliente HTTP.

## 4. Fake API

Quando `NEXT_PUBLIC_API_URL` não está configurada, o cliente utiliza `/api`.

Nesse cenário, as chamadas podem ser atendidas pelas rotas da própria aplicação Next.js, que utiliza mocks e armazenamento local para simular funcionalidades da API.

Esse fluxo não deve ser confundido com uma chamada obrigatória ao backend Express.

## 5. Recomendações e módulo de IA

A rota `frontend/src/app/api/produtos/recomendacoes/route.ts` verifica se `RECOMENDACAO_API_URL` está configurada.

Quando disponível, tenta consultar o módulo de IA. Se não houver configuração ou a consulta falhar, utiliza o mecanismo local `recomendarPara`.

A resposta identifica a origem das recomendações pelo cabeçalho `X-Recomendacao-Fonte`.

## 6. Demonstração de concorrência

O módulo `backend/backend/Origem.Concorrencia/` é uma aplicação ASP.NET Core independente.

No fluxo do produto demonstrativo `prd_201`, o frontend utiliza `NEXT_PUBLIC_CONCORRENCIA_API_URL` para acessar o endpoint POST `/demo/compras`.

O módulo controla o estoque em memória utilizando `lock` e processa notificações por meio de uma fila em segundo plano.

Esse fluxo não utiliza o Prisma nem o PostgreSQL para persistir o estoque demonstrativo.

## 7. Persistência

A arquitetura de persistência está detalhada em `persistencia-prisma.mmd`.

O Prisma Client é responsável pelo acesso aos dados do PostgreSQL. A estrutura atual das tabelas é criada e preparada por scripts SQL versionados em `database/sql/`.
