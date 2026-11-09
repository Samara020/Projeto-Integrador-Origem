# E2 · TDD no Origem

Regra do grupo: **nenhuma regra de negócio entra sem um teste vermelho antes.**
Ciclo: escrever o teste (vermelho) → menor código que passa (verde) → refatorar com o teste protegendo.

## 1. Story map

Atividades do usuário (linha de cima) e histórias por release (linhas de baixo).

| | Descobrir peças | Decidir a compra | Comprar | Vender (artesão) | Moderar (admin) |
|---|---|---|---|---|---|
| **MVP** | Vitrine e busca | Detalhe da peça | Carrinho | Cadastrar peça | Validar origem |
| **MVP** | Filtro técnica/região | Avaliações | Checkout e pedido | Controlar estoque | Moderar avaliações |
| **Release 2** | Recomendação (IA) | Comparar peças | Acompanhar pedido | Gerir pedidos | Indicadores |

## 2. Story → tarefas → testes por nível

| História | Tarefa (regra) | Unitário (Jest) | API (Jest + servidor) | E2E (Cypress) |
|---|---|---|---|---|
| Carrinho | não passar do estoque; somar quantidade do mesmo item; total correto | `frontend/tests/unit/carrinho.test.ts` | — | `e2e/cypress/e2e/compra.cy.js` |
| Checkout e pedido | pedido nasce com status inicial; peça única fica reservada | `frontend/tests/unit/pedidos.test.ts` | — | `compra.cy.js` |
| Vitrine e busca | filtro por termo, categoria, região; paginação no envelope do contrato | `produtos.test.ts` | `frontend/tests/api/produtos.test.ts`, `catalogo.test.ts` | `vitrine.cy.js` |
| Acesso | papel COMPRADOR/ARTESAO/ADMINISTRADOR; admin sem convite = 403 | `destino.test.ts` | `auth.test.ts` | `acesso.cy.js` |
| Cadastrar peça / estoque | campos obrigatórios; estoque não negativo | `painel-artesao.test.ts`, `validacao.test.ts` | — | `cadastro-peca.cy.js` |
| Validar origem / moderar | decisão exige justificativa; filtro por status | `admin.test.ts` | `api/admin.test.ts` | — |
| Recomendação (IA) | pesos categoria 0,5 · técnica 0,3 · região 0,2; produto inexistente cai no fallback | `modulo-ia/tests/test_recommendation.py` | `modulo-ia/tests/test_api.py`, `api/recomendacoes.test.ts` | — |

## 3. Na esteira

`testes.yml` roda os três níveis em toda execução (commit, merge na main, agendado 2h), incluindo Jest/Supertest com PostgreSQL isolado no nível API. No merge na main, o job `imagens` de `testes-merge.yml` depende de `regressao` (`needs`): teste vermelho barra o build das imagens. O Dockerfile do módulo de IA também executa pytest antes de produzir a imagem.

A publicação pela integração Git da Vercel é independente destes jobs. O repositório não comprova um bloqueio da Vercel por resultado dos testes; isso precisa ser configurado na plataforma ou substituído por deploy condicionado à regressão. Não interpretar build bloqueado como publicação bloqueada.

## Amostra transacional e execução local

- `backend/app/tests/compra-transacional.test.ts`: estoque concorrente, checkout duplicado, preço da compra, pagamento idempotente, cancelamento e rollback com falha real de persistência injetada no banco de testes.
- `backend/app/tests/permissoes.test.ts`: isolamento entre compradores e lojas, pagamento/cancelamento alheios e ausência de autenticação.
- `frontend/tests/unit/checkout.test.ts`: envios concorrentes compartilham a criação do pedido; falha permite nova tentativa.
- `acesso.cy.js` e `compra.cy.js`: casos antes ignorados estão ativos, com guarda do painel e trava de criação do pedido.

Instalação, matriz de execução e limites em [TestesAutomatizados.md](TestesAutomatizados.md). Os E2E atuais ainda usam a Fake API; a suíte do backend verifica HTTP e PostgreSQL e não deve ser apresentada como jornada completa do navegador com a API real.

## 4. Jornada e lições aprendidas (preencher pelo grupo, para a apresentação)

> Esta parte é de vocês: a IA não sabe como foi a experiência. Respondam com exemplos reais.

- Qual regra nasceu de um teste vermelho primeiro? (mostrar o commit do teste antes do commit do código)
- Um bug que o teste pegou antes de chegar na main.
- O que foi difícil (ex.: testar `localStorage`, servidor subindo na esteira, E2E instável).
- O que fariam diferente.
