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

- `produtosService` (`src/services/produtos.ts`): listagem paginada, filtros (busca, categoria, técnica, região/origem, preço, avaliação, disponibilidade, peça única, ordenação), vitrine em destaque, comparação, recomendações e detalhes de produto (`GET /produtos`, `GET /produtos/:id`, `GET /produtos/recomendacoes`).
- `artesaosService` (`src/services/artesaos.ts`): perfil público dos artesãos e catálogo de peças associadas (`GET /artesaos/:id/perfil`).
- `catalogoService` (`src/services/catalogo.ts`): categorias, técnicas, regiões e indicadores reais da API (`GET /categorias`, `GET /tecnicas`, `GET /regioes`, `GET /indicadores`).
- `authService` (`src/services/auth.ts`): login (`POST /auth/login`), cadastro (`POST /auth/register`), recuperação/redefinição de senha (`POST /auth/recuperar-senha`, `POST /auth/redefinir-senha`) e gestão de sessão JWT (redirecionamento para `/entrar?motivo=sessao-expirada` em resposta `401` fora de `/auth/*`).
- `carrinhoService` (`src/services/carrinho.ts`): persistência do carrinho no banco para comprador autenticado via `GET /carrinho`, `POST /carrinho/itens`, ajuste absoluto atômico via `PUT /carrinho/itens/:produtoId` (`{ quantidade }` >= 1) e remoção separada via `DELETE /carrinho/itens/:produtoId` (com fallback local exclusivo para visitantes não autenticados).
- `pedidosService` (`src/services/pedidos.ts`): cotação de frete (`POST /painel/envios/cotacao`), checkout de compra (`POST /pedidos/checkout` com `opcaoEnvioId` e `enderecoEntrega`) e histórico do comprador (`GET /comprador/pedidos`).
- `pagamentosService` (`src/services/pagamentos.ts`): processamento de pagamentos (`POST /pagamentos`).
- `painelArtesaoService` (`src/services/painelArtesao.ts`): métricas (`GET /painel/artesao/painel/metricas`), criação e listagem/estoque de peças (`POST /produtos`, `GET /produtos/artesao/pecas`, `PUT /produtos/artesao/pecas/:id/estoque`, `DELETE /produtos/:id`), perfil (`GET`/`PUT /artesao/perfil`), envio (`GET`/`PUT /painel/artesao/envio/configuracoes`) e pedidos recebidos (`GET /artesao/pedidos`, `PUT /artesao/pedidos/:id/status`).
- `adminService` (`src/services/admin.ts`): métricas administrativas (`GET /painel/admin/painel/metricas`), validação de origem (`GET /produtos/admin/produtos/pendentes`, `PUT /produtos/admin/produtos/:id/validacao`), moderação (`GET /avaliacoes/admin/avaliacoes`, `PUT /avaliacoes/admin/avaliacoes/:id/moderar`) e perfil/senha (`GET`/`PUT /painel/admin/perfil`, `PUT /painel/admin/senha`).
- `avaliacoesService` (`src/services/avaliacoes.ts`): envio e consulta de avaliações via HTTP (`POST /avaliacoes`, `GET /avaliacoes/produtos/:id/avaliacoes`, `GET /avaliacoes/comprador/avaliacoes`).
- `suporteService` (`src/services/suporte.ts`) e `personalizacoesService` (`src/services/personalizacoes.ts`): tickets/mensagens de suporte (`/suporte/tickets*`) e solicitações de personalização (`/produtos/:id/personalizacoes`, `/comprador/personalizacoes`).

## Testes

```bash
# Testes unitários dos services, componentes e validações do frontend (com @/lib/http mockado)
npm run test:unit

# Testes de integração de API contra backend real + Postgres (http://localhost:4000 ou API_BASE_URL)
npm run test:api

# Testes E2E Cypress contra ambiente descartável ou runtime dedicado (executa em subshell sem alterar cwd)
(cd ../e2e && CYPRESS_BASE_URL=http://localhost:3200 CYPRESS_API_URL=http://localhost:4200 npm test)

# Geração de tipos do Next.js (necessário em cópia limpa antes do tsc)
npx next typegen

# Verificação de lint, tipos e build de produção
npm run lint
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
```
