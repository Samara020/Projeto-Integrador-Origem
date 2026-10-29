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

`testes.yml` roda os três níveis em toda execução (commit, merge na main, agendado 2h). No merge na main o job `deploy` depende dos testes (`needs`), então teste vermelho barra o deploy. O Dockerfile do módulo de IA tem um estágio `test` que roda o pytest: teste vermelho também barra a imagem.

## 4. Jornada e lições aprendidas (preencher pelo grupo, para a apresentação)

> Esta parte é de vocês: a IA não sabe como foi a experiência. Respondam com exemplos reais.

- Qual regra nasceu de um teste vermelho primeiro? (mostrar o commit do teste antes do commit do código)
- Um bug que o teste pegou antes de chegar na main.
- O que foi difícil (ex.: testar `localStorage`, servidor subindo na esteira, E2E instável).
- O que fariam diferente.
