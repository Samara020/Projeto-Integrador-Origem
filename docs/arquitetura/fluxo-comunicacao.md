# Fluxo de comunicação

## 1. Comunicação entre frontend e backend

O frontend centraliza as requisições HTTP em `frontend/src/lib/http.ts`, utilizando Axios.

A URL base é definida por `NEXT_PUBLIC_API_URL` no navegador (ou `API_BASE_URL` / `BACKEND_URL` / `NEXT_PUBLIC_API_URL` no servidor), com padrão `http://localhost:4000`, e usa `/api` automaticamente em deploys na Vercel (same-origin rewrite).

As chamadas utilizam diretamente as rotas canônicas do `docs/ContratoDeAPI.md` (montadas na raiz `/` do Express em `backend/app/src/routes/index.ts`), sem reescrita de caminhos em `http.ts`. O cliente HTTP recupera a sessão armazenada localmente e adiciona o cabeçalho `Authorization: Bearer <token>` quando existe token JWT válido.

## 2. Exemplo real: listagem de produtos

O exemplo utiliza a rota `GET /produtos`, implementada em `backend/app/src/routes/produtos.routes.ts`.

### 2.1. Requisição HTTP

Exemplo de chamada direta ao backend Express:

    GET http://localhost:4000/produtos?pagina=1&limite=10

A rota aceita os seguintes filtros combinados:

| Parâmetro | Finalidade |
|---|---|
| `termo` | Pesquisa por nome da peça (exclui itens sem estoque) |
| `categoria` | Filtra por ID numérico ou nome da categoria |
| `tecnica` | Filtra pela técnica artesanal |
| `regiao` / `origem` | Filtra pela região/origem da peça |
| `disponivel` / `destaque` | Restringe a peças com estoque disponível (`> 0`) |
| `precoMax` | Filtra por preço máximo |
| `pecaUnica` | Restringe a peças únicas |
| `avaliacaoMin` | Filtra por média mínima de avaliações publicadas |
| `ordenar` | `menor-preco`, `maior-preco`, `melhor-avaliacao` ou mais recentes |
| `pagina` | Define a página da listagem (padrão `1`) |
| `limite` | Define a quantidade por página (padrão `10`, máximo `50`) |

### 2.2. Recebimento pelo Express

O arquivo `backend/app/src/index.ts` configura:

- Helmet;
- CORS (expondo `X-Recomendacao-Fonte`);
- Parser JSON (`10mb`);
- Middleware `idsComoTexto` (serializa IDs numéricos como `string`);
- Rota de saúde `/health`;
- Rotas da aplicação (`montarRotas`);
- Middleware global de erros (`rotaNaoEncontrada` e `tratarErro`).

Em `backend/app/src/routes/index.ts`, as rotas canônicas são montadas na raiz `/` (`rotasDiretasProdutos`, `rotasDiretasAvaliacoes`, `painelRoutes`, `rotasDiretasPedidos`, `catalogoRoutes`), mantendo os prefixos por módulo (`/auth`, `/produtos`, `/artesaos`, `/artesao`, `/carrinho`, `/pedidos`, `/pagamentos`, `/avaliacoes`, `/suporte`, `/painel`, `/demo`).

### 2.3. Rota e controller

A rota `GET /` de `produtos.routes.ts` encaminha a requisição para `ProdutosController.listar()`, que chama `produtoService.listar(req.query)` e responde o envelope `{ total, pagina, limite, itens }`.

### 2.4. Service

O método `produtoService.listar()` (`backend/app/src/services/produto.service.ts`):

1. Normaliza flags booleanas, `precoMax`, `origem` e paginação.
2. Delega a consulta ao `produtoRepository.listar()` (a camada `services/` não importa `prisma` diretamente).
3. Formata preço, SKU, selo de autenticidade persistido (`seloAtivo`), dados do artesão, região, modalidade, disponibilidade e campos técnicos.

### 2.5. Repository e Prisma

O método `produtoRepository.listar()` (`backend/app/src/repositories/produto.repository.ts`):

1. Monta o filtro no PostgreSQL exigindo `excluido = false`, `pausado = false` e `statusValidacao = "APROVADA"` (persistidos na tabela `produto` via `database/sql/07` e `08`, sem estado em memória).
2. Aplica filtros de termo, categoria, técnica, região/origem, preço máximo, peça única e disponibilidade.
3. Executa `prisma.produto.findMany()` incluindo `categoria`, `loja` (com `usuario`), `estoque`, `avaliacoes` e a imagem de capa.
4. Calcula a média de avaliações publicadas, aplica filtro de nota mínima, ordenação e paginação (máximo 50 itens).

### 2.6. PostgreSQL

O Prisma Client (`backend/app/src/lib/prisma.ts`) executa as consultas no PostgreSQL 17 configurado em `DATABASE_URL` e retorna os registros pela cadeia inversa (`repository -> service -> controller -> Axios -> UI`).

### 2.7. Exemplo de resposta JSON

    {
      "total": 14,
      "pagina": 1,
      "limite": 10,
      "itens": [
        {
          "id": "2001",
          "nome": "Vaso Cerâmica Raízes",
          "preco": 160,
          "sku": "ORG-002001",
          "imagemPrincipal": "/produtos/vaso-ceramica.jpg",
          "artesao": {
            "id": "1006",
            "nome": "Ateliê Mãos da Mata"
          },
          "seloAtivo": true,
          "regiao": {
            "id": "Zona da Mata - PE",
            "nome": "Zona da Mata - PE"
          },
          "modalidadeProducao": "PRONTA_ENTREGA",
          "disponibilidade": "DISPONIVEL"
        }
      ]
    }

### 2.8. Tratamento de erros

O middleware `backend/app/src/middleware/error.ts` centraliza o tratamento de erros:

- Erros `ErroApp` retornam o status HTTP definido e `{ "mensagem": "..." }`.
- Erros de validação Zod retornam HTTP `400`.
- Erros inesperados são registrados no console e retornam HTTP `500` com `{ "mensagem": "Erro interno do servidor." }`.

## 3. Fluxo resumido em camadas

```text
Frontend (Next.js)
  → Cliente HTTP Axios (frontend/src/lib/http.ts, sem reescrita de rotas)
  → API Express (backend/app/src/index.ts + routes/)
  → Middlewares (helmet, cors, auth JWT, validacao Zod)
  → Controller (backend/app/src/controllers/)
  → Service (backend/app/src/services/ — regras de negócio, sem Prisma direto)
  → Repository (backend/app/src/repositories/ — único ponto de acesso ao Prisma)
  → Prisma Client → PostgreSQL 17 (esquema versionado em database/sql/)
```

## 4. Remoção da Fake API

As antigas rotas Next.js em `frontend/src/app/api/` e os dados de `frontend/src/mocks/` foram removidos após a integração completa com o backend Express e o PostgreSQL.

## 5. Recomendações e módulo de IA

O endpoint `GET /produtos/recomendacoes` delega a `recomendacaoService.recomendar()` (`backend/app/src/services/recomendacao.service.ts`), que consulta o catálogo aprovado no PostgreSQL via `produtoRepository.catalogoParaRecomendacao()`.

Quando `RECOMENDACAO_API_URL` está configurada, envia o catálogo real ao módulo BentoML (`POST /recommendations`, timeout de 2 s) e retorna o cabeçalho `X-Recomendacao-Fonte: ia`. Em caso de falha/timeout ou ausência de configuração, aplica o baseline local sobre o mesmo catálogo persistido no PostgreSQL (`X-Recomendacao-Fonte: baseline`).

## 6. Demonstração de concorrência

O módulo `backend/backend/Origem.Concorrencia/` é uma aplicação ASP.NET Core (.NET 10) independente fora do `compose.yaml`, usada como demonstração em memória de controle de concorrência com `lock` e fila assíncrona (`Channel` + `BackgroundService`), conforme `ADR-003`. No fluxo principal de produção, o controle de concorrência em estoque, carrinho, checkout e cancelamento ocorre no PostgreSQL via travas `FOR UPDATE` em transações Prisma (`pedido.repository.ts` e `carrinho.repository.ts`).

## 7. Persistência

A arquitetura de persistência está detalhada em `persistencia-prisma.mmd` e `adr/ADR-001-persistencia-e-prisma.md`. Toda evolução estrutural do banco é versionada em scripts SQL em `database/sql/` (`01` a `09`), aplicados no startup de desenvolvimento por `backend/app/src/lib/setup-db.ts` quando `AUTO_SETUP_DB=true`.
