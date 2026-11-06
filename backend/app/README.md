# API Origem — Backend (Node + Express + TypeScript + Prisma)

API REST do marketplace de artesanato do Projeto Origem. Construída com Node.js, Express, TypeScript e Prisma ORM sobre PostgreSQL.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Linguagem | TypeScript 5 |
| ORM | Prisma 5 |
| Banco | PostgreSQL |
| Autenticação | JWT (jsonwebtoken) |
| Senhas | bcryptjs |
| Validação | Zod |
| Testes | Jest + Supertest |

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/origem_db?schema=public"
JWT_SECRET="chave_secreta_mude_em_producao"
JWT_EXPIRES_IN="7d"
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | String de conexão PostgreSQL | obrigatória |
| `JWT_SECRET` | Chave para assinar tokens JWT | obrigatória |
| `AUTO_SETUP_DB` | `true` cria tabelas e seed ao subir a API se o banco estiver vazio (só dev) | `false` |
| `DATABASE_URL_TEST` | Banco usado pelos testes (apagado a cada teste) | obrigatória p/ `npm test` |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `PORT` | Porta da API | `4000` |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:3000` |

---

## Scripts

```bash
npm install              # instala dependências
npx prisma generate      # gera o Prisma Client
npm run dev              # servidor de desenvolvimento (tsx watch)
npm run build            # compila TypeScript (tsc)
npm start                # inicia em produção (node dist/src/index.js)
npm test                 # roda suíte de testes (Jest, --runInBand)
npm run test:watch       # testes em modo watch
```

---

## Banco de dados

O banco é definido pelos scripts SQL em `database/sql/`, que são a fonte da verdade. O `prisma/schema.prisma` apenas **mapeia** essas tabelas (`@@map`/`@map`); não há migrações do Prisma. **Não use** `prisma migrate` nem `prisma db push`.

Ordem de criação (use `psql -f` ou `npx prisma db execute --file <arquivo> --schema prisma/schema.prisma`):

1. `01_create_tables.sql`
2. `02_integrity_rules.sql`
3. `04_create_indexes.sql`
4. `05_seed_dados_reais.sql` (dados de desenvolvimento)

Alterou as tabelas? Atualize o SQL e o `schema.prisma` juntos, depois rode `npx prisma generate`.

### Limitações do esquema SQL

O SQL não tem tabelas ou colunas para o que segue. Esses dados ficam **em memória** (perdem-se ao reiniciar a API) ou são derivados:

| Recurso | Tratamento |
|---|---|
| Tickets de suporte | em memória (`ticket.repository.ts`) |
| Validação de produto / selo | em memória (`lib/memoria.ts`); produto sem registro conta como `APROVADA`, produto novo nasce `PENDENTE` |
| Moderação de avaliações | em memória (`lib/memoria.ts`) |
| Código de rastreio | gravado em `historico_pedido.observacao` (`Rastreio: <código>`) |
| Perfil do admin | primeiro usuário `ADMINISTRADOR` |
| `sku`, `material`, `dimensoes`, `peso`, `certificado`... | não persistidos |
| Endereço de entrega | exige bairro, cidade e CPF; sem eles no checkout, usa valores neutros |

IDs são `INTEGER` no banco e saem como **string** na API (`middleware/ids-texto.ts`), conforme o contrato.

### Testes

Os testes apagam todas as tabelas, por isso usam um banco próprio. Defina `DATABASE_URL_TEST` (diferente de `DATABASE_URL`) apontando para um banco criado com os scripts `01`, `02` e `04`.

---

## Autenticação

A API usa JWT em header `Authorization: Bearer <token>`.

### Middleware de papel

| Middleware | Papéis permitidos |
|------------|-------------------|
| `autenticar` | qualquer usuário autenticado |
| `compradorApenas` | `COMPRADOR` |
| `artesaoApenas` | `ARTESAO` |
| `adminApenas` | `ADMINISTRADOR` |

### Papéis (contrato)

`COMPRADOR`, `ARTESAO`, `ADMINISTRADOR`

---

## Endpoints

### Catálogo (público)

`GET /categorias`

Lista categorias disponíveis.

**Resposta:** array de `{ id, nome, descricao? }`

---

### Produtos

`GET /produtos`

Lista produtos aprovados com envelope paginado.

**Query params:**
- `termo` — busca por nome (ignora acento/maiúscula)
- `categoria` — filtro por nome da categoria
- `tecnica` — filtro por técnica
- `regiao` — filtro por origem/região
- `precoMax` — preço máximo (inclusivo)
- `avaliacaoMin` — avaliação mínima
- `disponivel` — `true` para só disponíveis
- `pecaUnica` — `true` para só peças únicas
- `ordenar` — `menor-preco` \| `maior-preco`
- `pagina` — padrão 1
- `limite` — padrão 10, máximo 50

**Resposta:**
```json
{
  "total": 42,
  "pagina": 1,
  "limite": 10,
  "itens": [
    {
      "id": "uuid",
      "nome": "Vaso Cerâmica Raízes",
      "preco": 160,
      "imagemPrincipal": "/produtos/vaso.jpg",
      "artesao": { "id": "uuid", "nome": "Zefa do Pajeú" },
      "seloAtivo": true,
      "regiao": { "id": "zona-da-mata", "nome": "Zona da Mata" },
      "modalidadeProducao": "PRONTA_ENTREGA",
      "disponibilidade": "DISPONIVEL"
    }
  ]
}
```

`GET /produtos/:id`

Detalhe completo de um produto.

**Resposta:** `{ id, nome, preco, descricao, imagens[], categoria: {id, nome}, tecnica, estoque, totalAvaliacoes, dimensoes, material, regiao: {id, nome}, artesao: {id, nome, loja}, modalidadeProducao, seloAtivo, disponibilidade }`

**Erros:** `404` se não encontrado.

`GET /produtos/recomendacoes?produtoId=<id>`

Produtos recomendados da mesma categoria (exclui o próprio produto).

**Resposta:** `{ produtosRecomendados: [{ id, nome, preco, imagemPrincipal, tecnica }] }`

`GET /produtos/comparar?ids=id1,id2,...`

Lista de produtos para comparação.

**Resposta:** `{ produtosComparados: [{ id, nome, preco, tecnica }] }`

---

### Criação de produto (artesão)

`POST /produtos` — `autenticar` + `artesaoApenas`

**Body (Zod):**
```json
{
  "nome": "string (mín. 2)",
  "descricao": "string?",
  "categoria": "string (nome da categoria)",
  "tecnica": "string",
  "origem": "string",
  "preco": "number (> 0)",
  "modalidadeProducao": "PECA_UNICA \| PRONTA_ENTREGA \| SOB_ENCOMENDA",
  "estoque": "number (int >= 0)",
  "prazoProducaoDias": "number?",
  "capacidadeProducao": "number?",
  "imagens": "string[] (URLs)",
  "sku": "string?",
  "material": "string?",
  "dimensoes": "string?",
  "peso": "number?",
  "informacoesOrigem": "string?",
  "certificado": "string?"
}
```

**Resposta (201):** `{ id, sku, statusValidacao, criadoEm }`

**Erros:** `401` (não autenticado), `403` (não é artesão), `400` (validação Zod)

---

### Gerenciamento do próprio artesão

`PUT /produtos/:id` — `autenticar` + `artesaoApenas`

Atualiza produto próprio. `403` se o produto não pertencer à loja do usuário.

`DELETE /produtos/:id` — `autenticar` + `artesaoApenas`

Inativa produto (define estoque 0). `403` se não for dono.

`GET /artesao/pecas` — `autenticar` + `artesaoApenas`

Lista peças do artesão logado.

**Query:** `?situacao=ESTOQUE_BAIXO` filtra estoque < 5.

`PUT /artesao/pecas/:id/estoque` — `autenticar` + `artesaoApenas`

Atualiza estoque de uma peça própria.

---

### Validação de origem (admin)

`GET /admin/produtos/pendentes` — `autenticar` + `adminApenas`

Lista peças pendentes de validação.

**Query:** `?status=PENDENTE\|APROVADA\|REPROVADA`

**Resposta:** `{ total, itens: [{ id, nome, imagemPrincipal, artesao: {id, nome}, tecnica, regiao, enviadoEm, informacoesOrigem, certificado, statusValidacao, justificativa, decididoEm }] }`

`PUT /admin/produtos/:id/validacao` — `autenticar` + `adminApenas`

Aprova ou reprova uma peça.

**Body:** `{ status: "APROVADA" \| "REPROVADA", justificativa: "string" }`

Regras: reprovação exige justificativa com ≥ 10 caracteres; segunda decisão na mesma peça retorna `409`.

---

### Pedidos

`POST /pedidos/checkout` — `autenticar` + `compradorApenas`

Finaliza compra a partir do carrinho do comprador.

**Body:** `{ enderecoEntrega: { cep, rua, numero } }`

**Resposta (201):** `{ pedidoId, status, valorTotal }`

Requisito: o comprador deve ter um carrinho com itens. `400` se carrinho vazio.

`GET /pedidos/comprador/pedidos` — `autenticar` + `compradorApenas`

Lista pedidos do comprador logado.

**Resposta:** `{ pedidos: [{ id, status, valorTotal, criadoEm, itens: [{ produtoId, nome, imagemPrincipal, quantidade, precoUnitario }] }] }`

`GET /pedidos/artesao/pedidos` — `autenticar` + `artesaoApenas`

Lista pedidos recebidos pelo artesão (peças da sua loja).

**Resposta:** `{ pedidosRecebidos: [{ id, criadoEm, statusProducao, comprador: { nome, local }, itens: [...], valorTotal, proximaAcao, codigoRastreio }] }`

`PUT /pedidos/artesao/pedidos/:id/status` — `autenticar` + `artesaoApenas`

Atualiza status de um pedido recebido.

**Body:** `{ status: "string", codigoRastreio?: "string" }`

---

### Respostas de erro

Todas as respostas de erro seguem o formato:

```json
{ "mensagem": "texto para o usuário" }
```

| Status | Significado |
|--------|-------------|
| `400` | Erro de validação ou regra de negócio |
| `401` | Não autenticado |
| `403` | Sem permissão para o papel/recurso |
| `404` | Recurso não encontrado |
| `409` | Conflito (decisão já tomada, item duplicado) |
| `429` | Limite de requisições |
| `500` | Erro interno do servidor |
| `507` | Sem espaço para gravar no navegador (apenas Fake API) |

---

## Modelo de dados (Prisma)

Principais modelos em `prisma/schema.prisma`:

| Modelo | Descrição |
|--------|-----------|
| `Usuario` | Usuário do sistema (papel: COMPRADOR, ARTESAO, ADMINISTRADOR) |
| `Categoria` | Categoria de produto |
| `Loja` | Loja do artesão (1:1 com Usuario) |
| `Produto` | Peça artesanal (pertence a Categoria e Loja) |
| `Imagem` | Imagens do produto |
| `Estoque` | Controle de estoque (1:1 com Produto) |
| `Carrinho` | Carrinho de compras (1:1 com Usuario) |
| `ItemCarrinho` | Item do carrinho |
| `EnderecoEntrega` | Endereço de entrega do usuário |
| `Pedido` | Pedido de compra |
| `ItemPedido` | Item do pedido |
| `Pagamento` | Pagamento (1:1 com Pedido) |
| `Avaliacao` | Avaliação de produto |
| `Ticket` | Ticket de suporte |
| `MensagemTicket` | Mensagem do ticket |
| `PerfilAdmin` | Perfil do administrador |

---

## Testes

```bash
npm test
```

Os testes usam Jest + Supertest e rodam em sequência (`--runInBand`) para evitar conflitos de banco. Eles requerem um banco PostgreSQL acessível via `DATABASE_URL` (ou `DATABASE_URL_TEST` se definida).

Estrutura:
- `tests/setup.ts` — aplica migrações e desconecta o Prisma
- `tests/produtos.test.ts` — endpoints de produtos (listar, detalhar, criar, filtrar, comparar, recomendar)
- `tests/pedidos.test.ts` — endpoints de pedidos (checkout, listar comprador, listar artesão, atualizar status)

---

## Estrutura de pastas

```
src/
  index.ts              # Cria e exporta a app Express
  config.ts             # Porta e CORS
  lib/
    prisma.ts           # Cliente Prisma singleton
    jwt.ts              # Utilitários de token JWT
  middleware/
    auth.ts             # Autenticação e controle de papel
    error.ts            # Tratamento padronizado de erros (ErroApp)
  routes/
    index.ts            # Monta todas as rotas
    auth.routes.ts
    produtos.routes.ts
    artesao.routes.ts
    carrinho.routes.ts
    pedidos.routes.ts
    pagamentos.routes.ts
    avaliacoes.routes.ts
    suporte.routes.ts
    painel.routes.ts
    catalogo.routes.ts
    demo.routes.ts
  controllers/
    *.controller.ts
  services/
    *.service.ts
  repositories/
    *.repository.ts
prisma/
  schema.prisma         # Modelo de dados
  migrations/           # Migrações versionadas SQL
```

---

## Integração com o frontend

O frontend consome esta API através de `src/lib/http.ts` (axios), que lê `NEXT_PUBLIC_API_URL`. Quando definida, aponta para esta API (ex: `http://localhost:4000`); quando não definida, usa a Fake API em `/api`.

Os nomes de campo da API seguem o `docs/ContratoDeAPI.md` (`nome`, `preco`, `imagemPrincipal`, `seloAtivo`, `regiao`, `disponibilidade`, etc.).
