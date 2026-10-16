<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Origem · regras do frontend

O bloco acima é gerado pelo `next dev`. Não edite entre os marcadores. Tudo daqui para baixo é nosso.

Regras visuais ficam em `DESIGN.md`. Regras de git e commit ficam no `AGENTS.md` da raiz.

## Antes de codar

1. `npm install` dentro de `frontend/`. Sem isso a pasta `node_modules/next/dist/docs/` não existe.
2. Este projeto usa Next 16, React 19 e React Compiler. Antes de usar uma API do Next (rotas, `params`, cache, `next/image`), leia o guia em `node_modules/next/dist/docs/`. Não confie em exemplo antigo da internet.
3. Leia `DESIGN.md` e a seção da sua tela em `../docs/ContratoDeAPI.md`.

## Comandos

- `npm run dev`: servidor local em `http://localhost:3000`.
- `npm run build`: precisa passar antes de abrir PR.
- `npm run lint`: precisa passar antes de abrir PR.

## Stack

- Next 16 (App Router), React 19, TypeScript estrito.
- Tailwind 4 para layout e estilo. Chakra UI 3 só para componente com comportamento (ver `DESIGN.md`).
- Ícones: `lucide-react`. Não use `react-icons`.
- Dependência nova só com combinado no grupo. Não instale biblioteca para resolver uma tela.

## Pastas

```
src/
  app/            rotas: page.tsx, layout.tsx, loading.tsx, error.tsx
    api/          Fake API (Route Handlers). Some na Avaliação 2
  components/
    ui/           peça base sem regra de negócio (Botao, Selo, Campo, snippets do Chakra)
    layout/       Header, Footer, Container
    produto/      ProdutoCard, ProdutoGrade, ProdutoGaleria
    artesao/      ArtesaoCard, ArtesaoResumo
    carrinho/     ItemCarrinho, ResumoCarrinho
  services/       um arquivo por domínio. Único lugar que fala com a API
  types/          contratos TypeScript, espelho do ContratoDeAPI.md
  mocks/          dados da Fake API. Só `app/api` importa daqui
  hooks/          useProdutos, useProduto, useCarrinho
  store/          estado global (carrinho, sessão)
  lib/            http.ts, formato.ts (moeda, data)
```

- `src/app/components/ui/` é o local antigo. Componente novo nasce em `src/components/`.
- Import sempre com alias: `@/components/...`, `@/services/...`. Nunca `../../../`.
- Arquivo de componente em PascalCase (`ProdutoCard.tsx`). O resto em kebab-case ou camelCase curto (`produtos.ts`, `http.ts`).

## Rotas do app

| Rota | Tela no Figma |
| --- | --- |
| `/` | Home · Vitrine |
| `/entrar` | Login |
| `/cadastro` | Cadastro |
| `/recuperar-senha` | Recuperação de senha |
| `/catalogo` | Catálogo · Busca |
| `/produto/[id]` | Detalhes do produto, Peça única (3 estados) |
| `/produto/[id]/avaliacoes` | Avaliações (no Figma é a visão do artesão; aqui, a da peça) |
| `/produto/[id]/personalizar` | Personalização de peça |
| `/artesao/[id]` | Loja do artesão |
| `/comparar` | Comparação de peças |
| `/recomendacoes` | Recomendações personalizadas |
| `/carrinho` | Carrinho |
| `/checkout` | Checkout, Pagamento |
| `/conta` | Perfil do comprador |
| `/conta/pedidos/[id]` | Acompanhamento de pedido |
| `/suporte` | Central de suporte |
| `/suporte/chat` | Chat com IA · Triagem (conversa nova) |
| `/suporte/[id]` | Chat com IA · Triagem, Escalonamento para humano (2 estados) |
| `/painel/artesao` | Dashboard do artesão |
| `/painel/artesao/pecas/nova` | Cadastro de peça |
| `/painel/artesao/estoque` | Gestão de estoque |
| `/painel/artesao/pedidos` | Gestão de pedidos |
| `/painel/artesao/perfil` | Perfil do artesão |
| `/painel/artesao/envio` | Transporte e embalagem |
| `/painel/admin` | Dashboard administrador |

Busca e filtros vivem na URL: `/catalogo?termo=barro&categoria=ceramica&regiao=agreste&pagina=2`. Assim o link pode ser compartilhado e o botão voltar funciona.

## Camada de dados (vale 35% da Avaliação 1)

O caminho de um dado até a tela é sempre este:

```
componente -> hook -> service -> lib/http.ts -> /api (Fake API hoje, backend real depois)
```

### Regras

1. **Nenhum dado fixo em `page.tsx` nem em componente.** Nem array, nem objeto, nem número de vitrine ("+800 artesãos"). Tudo vem de um service.
2. **Componente não chama `fetch`.** Componente usa hook. Hook usa service. Só `lib/http.ts` chama `fetch`.
3. **Só `app/api` importa de `mocks/`.** Se uma tela importar de `mocks/`, está errado.
4. **Nome de campo igual ao contrato.** `nome`, `preco`, `imagemPrincipal`, `seloAtivo`. Não traduza nem renomeie no front.
5. **Rota fake igual à rota real.** `GET /produtos` do contrato vira `src/app/api/produtos/route.ts`. `GET /produtos/{id}` vira `src/app/api/produtos/[id]/route.ts`.
6. **Listagem usa o envelope do contrato:** `{ total, pagina, limite, itens }`. Tipo: `Paginado<T>` em `types/`.
7. **Erro tem formato único:** status HTTP correto e corpo `{ "mensagem": "texto para o usuário" }`. O `http.ts` transforma isso em `ApiError`.

### Troca pelo backend real (Avaliação 2)

`lib/http.ts` lê a base da URL de `NEXT_PUBLIC_API_URL`. Sem a variável, usa `/api`.

Na Avaliação 2: define `NEXT_PUBLIC_API_URL` com o endereço do backend, apaga `src/app/api/` e `src/mocks/`. Tela, hook e tipo não mudam.

### Dado que muda (carrinho, pedido, sessão)

Route Handler em deploy serverless não guarda estado entre chamadas. Por isso, na Avaliação 1:

- Leitura (produtos, artesãos, categorias, técnicas, regiões, avaliações, indicadores): Fake API em `app/api`.
- Escrita (carrinho, pedidos, pagamento, avaliação nova, tickets de suporte, comparação, peças vistas, personalização, login simulado): o service guarda no `localStorage`, com a mesma assinatura que terá com o backend (`carrinhoService.adicionar(produto, quantidade)` devolve `Promise`).
- A triagem do suporte (HU-23) é uma lista de regras por palavra-chave em `services/suporte.ts`. O módulo de IA a substitui na Avaliação 2.

Quem usa o service não sabe a diferença. Na Avaliação 2 só o miolo do service muda.

### Onde buscar dado

Busque em Client Component, pelo hook. Server Component não consegue chamar `/api` com URL relativa, e a avaliação quer ver loading, erro e vazio na tela.

Todo hook de leitura devolve o mesmo formato: `{ dados, carregando, erro, recarregar }`.

### Simular lentidão e erro

Toda rota fake passa pelo helper de `lib/fake-api.ts`: aplica atraso de 400 ms e aceita `?_erro=500` para forçar falha. Use isso para testar loading e erro antes do PR.

### Lacunas do contrato (combinar com o backend)

O contrato ainda não tem, e a Avaliação 1 pede:

- `GET /categorias`, `GET /tecnicas`, `GET /regioes`.
- `GET /produtos/{id}/avaliacoes`.
- Filtros `tecnica` e `regiao` em `GET /produtos` (hoje só `termo`, `categoria`, `origem`).
- `GET /indicadores` (números da vitrine: artesãos, peças, nota média).
- Formato do corpo de erro. A Fake API usa `{ "mensagem": "..." }`.
- Campos de detalhe do produto: descrição, técnica, região, estoque, galeria de imagens, disponibilidade, total de avaliações.
- Região e disponibilidade no item de `GET /produtos` (o card mostra os dois).
- `nome` e `imagemPrincipal` no item de `GET /carrinho`.
- Perfil do artesão (`GET /artesaos/{id}/perfil`): foto, técnica, especialidade, verificado, história, citação, imagens, média e total de avaliações, peças vendidas.
- `POST /auth/redefinir-senha` com o token que chega por e-mail.
- `GET /comprador/avaliacoes`; `compraVerificada` e `respostaArtesao` na avaliação; `dimensoes` e `material` no detalhe da peça.
- `POST /suporte/tickets/{id}/mensagens` (mensagens do chat, classificação e sugestões da triagem); `prioridade` no ticket.
- `POST /produtos/{id}/personalizacoes` (solicitação ao artesão) e histórico de peças vistas.
- `codigoConvite` em `POST /auth/register` para administrador (sem ele, 403).
- `tecnica` e `regiao` em `POST /auth/register` para artesão. O Figma também pede CPF/CNPJ e localização: o front ainda não coleta, porque o contrato não recebe.

Os campos marcados com "lacuna" em `src/types/index.ts` são exatamente estes.

Se faltar campo para a sua tela: proponha a mudança em `../docs/ContratoDeAPI.md` no mesmo PR. Não invente campo só no front.

## Estados de tela (obrigatório em toda tela com dado)

Toda tela que busca dado trata os quatro estados:

1. **Carregando:** skeleton no formato do conteúdo. Nunca tela em branco, nunca spinner sozinho no meio.
2. **Erro:** mensagem clara e botão "Tentar de novo" ligado ao `recarregar`.
3. **Vazio:** explica o motivo e dá uma saída ("Nenhuma peça com esse filtro", botão "Limpar filtros").
4. **Sucesso.**

Ação assíncrona (adicionar ao carrinho, entrar, cadastrar): o botão muda durante o pedido (desabilita e mostra progresso). Clique sem resposta visual é bug.

Os frames "Estado de carregamento", "Estado vazio" e "Erro 500" do Figma são a referência.

## Componentes

- Server Component por padrão. `"use client"` só onde há estado, efeito, evento ou hook de dado.
- Componente de `components/ui/` não conhece `Produto` nem `Artesao`. Recebe texto, número, `children`.
- Componente de domínio recebe o objeto tipado: `<ProdutoCard produto={produto} />`.
- Um componente, uma cara. Precisa de variação? Use prop (`variante="secundario"`). Não copie o arquivo.
- Todo elemento clicável funciona. Link sem destino (`href=""` ou `#`) não entra na `main`. Navegação interna com `next/link`.
- Preço e data passam por `lib/formato.ts`. Não formate moeda na mão.

## Formulário (Login, Cadastro, Checkout)

- Todo campo tem `<label>` visível ligado ao input.
- Validação no envio e ao sair do campo. Mensagem de erro embaixo do campo, em texto.
- Senha nunca vai para `localStorage`, log ou URL.
- Papel do usuário segue o contrato: `COMPRADOR`, `ARTESAO`, `ADMINISTRADOR`.

## Checklist do PR

- [ ] `npm run build` e `npm run lint` passam.
- [ ] Nenhum dado fixo na tela. Nenhum import de `mocks/` fora de `app/api`.
- [ ] Carregando, erro e vazio implementados e testados com `?_erro=500`.
- [ ] Testado em 360 px, 768 px e 1440 px de largura.
- [ ] Só tokens do `DESIGN.md`. Nenhum hex solto, nenhum item da lista "NUNCA usar".
- [ ] Todo link e botão da tela leva a algum lugar.
