# Origem · DESIGN.md

Regras visuais do frontend. Se o código, o Figma e este arquivo discordarem, este arquivo vence. Quer mudar uma regra? Mude aqui, no mesmo PR.

## Fontes da verdade

1. **Interface (cor, fonte, espaçamento, componente):** o Figma. Link no `README.md` da raiz.
2. **Logo e marca:** `docs/Origem_Brand_Guidelines_Identidade_Visual.pdf`.
3. **Este arquivo:** transforma os dois em tokens e fecha o que eles deixam em aberto (mobile, acessibilidade, estados).

O Figma não tem variáveis cadastradas. Os valores abaixo foram lidos dos frames "Home · Vitrine" e "Login".

### Onde o Figma e o manual da marca discordam

- **Cor de ação:** Figma usa terracota `#8B2500`. O manual pede Vermelho Sangria `#C32822`. Vale o Figma.
- **Fontes:** Figma usa Lora nos títulos e Inter no corpo. O manual cita Space Grotesk ou Work Sans. Vale o Figma.
- **Paleta do manual** (ocre, vermelho, amarelo, azul) entra só nos estados de retorno: erro, aviso, link informativo.

## Tokens

Os tokens vivem em `src/app/globals.css`, dentro de `@theme` (Tailwind 4). Cada token vira classe: `--color-fundo` vira `bg-fundo`, `text-fundo`, `border-fundo`.

**Hex solto em componente é proibido.** Falta uma cor? Crie o token aqui e no `globals.css`.

### Cor

| Token | Valor | Uso |
| --- | --- | --- |
| `fundo` | `#F5F0E8` | Fundo da página |
| `superficie` | `#FFFDF8` | Header, card, painel, campo |
| `superficie-2` | `#EDE5D8` | Fundo de selo neutro, borda de card |
| `borda` | `#D8CCBC` | Borda de campo, divisória |
| `borda-forte` | `#C9B99A` | Borda de botão secundário |
| `tinta` | `#1A1A1A` | Texto principal, rodapé |
| `tinta-2` | `#5A4F44` | Texto de apoio, parágrafo |
| `tinta-3` | `#71685E` | Legenda, metadado (autor, região) |
| `tinta-4` | `#A09485` | Só placeholder de campo |
| `terracota` | `#8B2500` | Botão principal, link, preço em destaque |
| `terracota-escura` | `#6F1E00` | Hover do botão principal e do link |
| `selo` | `#174C3C` | Fundo do selo "Autêntico", sucesso |
| `selo-ponto` | `#5DD6A0` | Ponto do selo "Autêntico" |
| `erro` | `#C32822` | Mensagem e borda de erro |
| `aviso` | `#E6A218` | Alerta (estoque baixo), estrela de avaliação |
| `info` | `#1A528F` | Aviso informativo, balão do comprador no chat |
| `areia` | `#F4E6C5` | Chip de valor, balão da assistente, caixa de estimativa |

Contraste: `tinta-4` sobre `superficie` dá 2,9:1. Não passa no mínimo de leitura (4,5:1). Por isso fica só em placeholder. Onde o Figma usa `#A09485` em texto ("Ana Pereira · Pernambuco"), use `tinta-3`.

Tema único, claro. Não use `dark:` do Tailwind nem `_dark` do Chakra.

### Tipografia

- Títulos: **Lora**, peso 700.
- Corpo, botão, campo: **Inter**, pesos 400, 500, 600, 700.
- Preço, quantidade, id de pedido: Inter com `tabular-nums`.
- Carregamento por `next/font/google` no `layout.tsx` (o Next baixa no build e serve do próprio site). Não use `<link>` para o Google Fonts.

| Estilo | Tamanho | Fonte e peso | Altura de linha |
| --- | --- | --- | --- |
| `display` (título do hero) | `clamp(2rem, 1.2rem + 3.3vw, 3rem)` | Lora 700 | 1.1 |
| `h1` (título de página) | `clamp(1.5rem, 1.2rem + 1.2vw, 1.75rem)` | Lora 700 | 1.2 |
| `h2` (título de seção) | `clamp(1.25rem, 1.1rem + 0.6vw, 1.375rem)` | Lora 700 | 1.25 |
| `h3` (título de card) | `1rem` | Lora 700 | 1.3 |
| `corpo` | `1rem` | Inter 400 | 1.6 |
| `apoio` (menu, botão, rótulo) | `0.875rem` | Inter 500 a 700 | 1.4 |
| `legenda` | `0.75rem` | Inter 400 | 1.4 |

**Piso de 12 px.** O Figma usa 8 a 11 px em selo, legenda e rótulo de campo. No código, nada abaixo de `0.75rem`.

### Espaçamento

Escala de 4 pt. Use só estes passos do Tailwind: `1` `2` `3` `4` `5` `6` `8` `10` `12` `16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px).

Valor quebrado do Figma (6, 14, 28, 44 px) arredonda para o passo mais próximo. Valor arbitrário (`p-[13px]`) é bug.

- Margem lateral da página: `clamp(1rem, 4.5vw, 4rem)`. Dá 16 px no celular e 64 px em 1440.
- Largura máxima do conteúdo: `90rem` (1440 px), centralizado.
- Espaço vertical entre seções: `clamp(2rem, 1.5rem + 2vw, 3rem)`.
- Vão entre cards: `4` (16 px).

### Raio

Dois raios, mais a pílula. O Figma mistura 6, 8, 10 e 20: consolidamos.

- `raio` = 8 px: botão, campo, busca, card, botão de ícone.
- `raio-painel` = 20 px: painel grande (caixa de login, imagem do hero, modal).
- `rounded-full`: selo, avatar.

### Sombra

Uma só: `sombra-card` = `0 4px 16px rgb(43 22 15 / 0.08)`. Vale para card e painel. Botão não tem sombra própria.

## Layout e responsividade

O Figma só tem desktop (1440 px). O mobile é definido aqui. Construa do celular para cima.

Pontos de quebra do Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Componente que muda pela largura do próprio espaço (card em grade ou em lista) usa `@container`.

- **Header:** 76 px de altura. A partir de `lg`: logo, menu, busca e ícones em linha. Abaixo de `lg`: logo, ícones e botão de menu. O menu abre em `Drawer` e a busca desce para uma segunda linha de largura total.
- **Hero:** duas colunas a partir de `md` (texto à esquerda, foto à direita). Abaixo disso empilha: foto em cima, texto embaixo.
- **Faixa de categorias:** em linha a partir de `md`. Abaixo disso, rolagem horizontal com `scroll-snap`.
- **Grade de produtos:** 2 colunas, 3 em `md`, 4 em `lg`.
- **Catálogo:** filtros em coluna lateral a partir de `lg`. Abaixo disso, botão "Filtrar" abre `Drawer`.
- **Detalhes do produto:** galeria e informações lado a lado a partir de `md`. Abaixo disso empilha: foto, miniaturas, informações e botões de compra.
- **Login e Cadastro:** painel do formulário mais imagem a partir de `lg`. Abaixo disso, só o formulário.
- Área de toque mínima: 40 px por 40 px (o botão de ícone do Figma tem 36).
- Nada de rolagem horizontal na página em 360 px.

## Tailwind e Chakra: quem faz o quê

- **Tailwind:** todo layout, cor, tipografia e espaçamento. Sempre com os tokens.
- **Chakra UI:** só componente com comportamento difícil de acertar na mão: `Dialog`, `Drawer`, `Menu`, `Select`, `Tabs`, `Accordion`, `Toaster`, `Skeleton`, `Field`.
- Nunca estilize o mesmo elemento pelos dois. Se o componente é Chakra, o visual vem do tema do Chakra configurado com estes mesmos tokens, não de `className` por cima.

## Componentes base

Ficam em `src/components/ui/`. Antes de criar um, procure se já existe.

- **Botao e BotaoLink:** variantes `primario` (fundo `terracota`, texto branco), `secundario` (borda `borda-forte`, texto `tinta-2`), `contorno` (borda e texto `terracota`), `fantasma` (só texto `terracota`). Altura 44 px, texto `apoio` 700. Estado `carregando` desabilita e mostra progresso. Foco visível sempre.
- **Campo e Selecao:** rótulo em cima (`apoio` 700, `tinta`), caixa de 44 px, fundo `superficie`, borda `borda`. Erro: borda `erro` e mensagem embaixo em texto. O espaço da mensagem fica sempre reservado: se a mensagem aparece e some, o botão de enviar se mexe e o clique se perde. Em filtro, use `compacto`.
- **Selo:** pílula. `autentico` (fundo `selo`, ponto `selo-ponto`, texto `superficie`). `neutro` (fundo `superficie-2`, texto `tinta-2`).
- **ProdutoCard:** foto em proporção fixa (3:2), nome (`h3`), autor e região (`legenda`, `tinta-3`), preço, botão de carrinho. Peça reservada ou vendida ganha selo e o botão fica desabilitado. O card inteiro leva ao produto. O botão de carrinho não navega.
- **Esqueleto, EstadoVazio, EstadoErro:** usados em toda tela com dado. Referência: frames "Estado de carregamento", "Estado vazio" e "Erro 500".

## Imagem

- Sempre `next/image`, com `width` e `height` (ou `fill` com `sizes`). O Next entrega WebP sozinho.
- `priority` só na imagem principal do topo (hero, foto do produto). O resto carrega sob demanda, que é o padrão.
- `alt` descreve a peça: "Vaso de cerâmica pintado à mão". Imagem decorativa leva `alt=""`.
- Imagem dos mocks fica em `public/produtos/` e `public/artesaos/`. O link de imagem do Figma expira em 7 dias: baixe o arquivo, não aponte para o link.

## Ícones

Só `lucide-react`. Os nomes das camadas no Figma são os nomes do Lucide (`anvil`, `book`, `palette`, `hammer`, `map-pin`, `layers`, `tag`, `heart`, `shopping-cart`, `user`, `search`).

Tamanho 20 px na navegação, 16 px dentro de botão e campo. Botão só com ícone leva `aria-label`.

## Logo

- Arquivo em `public/marca/logo-origem.webp` (600 px, exportado do Figma). No header, 56 px de altura (versão reduzida, conforme o Figma).
- A composição completa, com ornamentos, nunca abaixo de 180 px de largura.
- Não recolorir, não distorcer, não aplicar sombra, brilho nem gradiente. Área de respiro igual à altura da estrela do "O".

## Texto de interface

- Frase curta, direta, em português do Brasil. Fale da peça e de quem fez.
- Número na tela (quantidade de artesãos, nota média) vem do recurso `indicadores` da API. Nunca digitado no JSX.
- Moeda: `R$ 120,00`, sempre por `lib/formato.ts`.
- Separador em linha de metadado: `·` ("Ana Pereira · Pernambuco").

## NUNCA usar

Lista vinculante. PR com item daqui não entra.

- Pílula com ponto acima de título ("● ARTESANATO NORDESTINO", "● BEM-VINDO DE VOLTA") e rótulo em caixa alta com traço acima de seção ("— DESTAQUES"). O Figma tem os dois. No código, o título abre a seção sozinho.
- Número decorativo em título de seção ("02 · a casa").
- Travessão em texto de interface. Separe com vírgula, dois-pontos, `·` ou parênteses.
- Seta digitada como texto ("Ver todos →"). Use o ícone `ArrowRight` com `aria-hidden`.
- Emoji como ícone, marcador ou enfeite.
- Roxo, gradiente decorativo, brilho, sombra colorida.
- Texto abaixo de 12 px. Texto em `tinta-4`.
- Hex, tamanho ou espaçamento fora dos tokens.
- Hover que levanta, gira ou desloca o card. Animação só como resposta a uma ação do usuário, até 200 ms, respeitando `prefers-reduced-motion`.
- Depoimento, avaliação ou número inventado e fixo na tela.
- Link para `#` ou `href` vazio. Botão que não faz nada.
- Lorem ipsum ou texto provisório na `main`.
- `react-icons`, `<img>` puro, `<link>` de fonte externa.
