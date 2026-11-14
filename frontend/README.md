# Origem · Frontend

Marketplace de artesanato, literatura e arte de Pernambuco. Next.js 16 (App Router), React 19 e Tailwind CSS 4.

## Execução com Backend Real

1. Certifique-se de que o backend e o banco de dados estejam em execução:
   ```bash
   cd ../backend/app
   docker compose up -d
   ```
   A API estará acessível em `http://localhost:4000`.

2. Configure o arquivo `.env.local` na pasta `frontend/`:
   ```bash
   cp .env.example .env.local
   ```
   Defina:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

## Camada de Services e Integração com Backend

A comunicação com o backend real é centralizada na pasta `src/services/` utilizando o utilitário `src/lib/http.ts`:

- `produtosService` (`src/services/produtos.ts`): listagem paginada, filtros (busca, categoria, técnica, região, preço, ordenação), vitrine em destaque e detalhes de produto (`/produtos`, `/produtos/:id`).
- `artesaosService` (`src/services/artesaos.ts`): perfis dos artesãos e catálogo de peças (`/artesaos/:id/perfil`).
- `catalogoService` (`src/services/catalogo.ts`): categorias reais da API (`/categorias`) e dados taxonômicos.
- `authService` (`src/services/auth.ts`): login (`/auth/login`), cadastro (`/auth/register`), recuperação de senha e gestão de tokens JWT.
- `carrinhoService` (`src/services/carrinho.ts`): persistência do carrinho no banco de dados via `/carrinho` e `/carrinho/itens` com token do usuário (e fallback local para visitantes não logados).
- `pedidosService` (`src/services/pedidos.ts`): checkout de compra (`POST /pedidos/checkout`) com validação de estoque e listagem dos pedidos do comprador (`GET /comprador/pedidos`).
- `pagamentosService` (`src/services/pagamentos.ts`): processamento de pagamentos (`POST /pagamentos`).
- `painelArtesaoService` (`src/services/painelArtesao.ts`): métricas do painel (`/artesao/painel/metricas`), peças e estoque (`/artesao/pecas`), criação de novos produtos e gestão de pedidos.
- `adminService` (`src/services/admin.ts`): métricas administrativas, fila de validação de origem de peças e moderação de avaliações.
- `avaliacoesService` (`src/services/avaliacoes.ts`): envio e consulta de avaliações de produtos.
- `suporteService` (`src/services/suporte.ts`): abertura de tickets de suporte.

## Testes

```bash
# Testes unitários dos services e validações do frontend
npm run test:unit

# Verificação de lint (sempre deve passar limpo)
npm run lint
```
