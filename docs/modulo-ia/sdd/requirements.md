# requirements.md — Requisitos e critérios de aceitação

Extraído de `docs/Baseline de IA.pdf` (seção 2.1, SDD). Preservados os mesmos identificadores
do Documento de Requisitos (RF-01 a RF-12 e RNF-01 a RNF-09). Fonte original: PDF não alterado.

## HU-17 — Recomendação de produtos

Como cliente, quero receber recomendações de peças relacionadas ao produto ou aos filtros que estou consultando, para descobrir outros produtos artesanais relevantes.

**RF-01** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ receber o produto de referência ou os filtros utilizados na consulta, juntamente com os atributos disponíveis para recomendação.

**RF-02** — QUANDO o marketplace solicitar recomendações, O MÓDULO DE RECOMENDAÇÃO DEVERÁ selecionar produtos candidatos elegíveis.

**RF-03** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ considerar somente produtos disponíveis.

**RF-04** — QUANDO houver um produto de referência, O MÓDULO DE RECOMENDAÇÃO DEVERÁ excluir esse produto da lista de recomendações.

**RF-05** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ comparar, no mínimo, os atributos categoria, técnica artesanal e região, quando estiverem disponíveis.

**RF-06** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ calcular um score de relação para cada candidato elegível com base nos atributos disponíveis e utilizar esse score na ordenação dos resultados.

**RF-07** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ ordenar os candidatos pela relação calculada.

**RF-08** — QUANDO for solicitada uma quantidade de recomendações, O MÓDULO DE RECOMENDAÇÃO DEVERÁ retornar, por padrão, 5 produtos recomendados, permitindo configurar a quantidade solicitada até o limite máximo de 20 produtos.

**RF-09** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ informar a justificativa baseada nos atributos utilizados.

**RF-10** — SE não houver candidatos suficientes, ENTÃO O MÓDULO DE RECOMENDAÇÃO DEVERÁ aplicar o fallback definido.

**RF-11** — SE não houver candidatos após o fallback, ENTÃO O MÓDULO DE RECOMENDAÇÃO DEVERÁ retornar lista vazia.

**RF-12** — QUANDO o Origem solicitar recomendações, O MÓDULO DE RECOMENDAÇÃO DEVERÁ responder pela INT-01.

## Critérios para requisitos não funcionais

**RNF-01** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ responder em até 1 segundo em condições normais.

**RNF-02** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ validar os dados de entrada antes do processamento.

**RNF-03** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ exigir autenticação e autorização.

**RNF-04** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ utilizar somente os dados necessários e não exigir dados pessoais sensíveis.

**RNF-05** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ registrar métricas sem dados pessoais desnecessários.

**RNF-06** — A justificativa deverá corresponder aos atributos efetivamente utilizados no cálculo da recomendação, sem apresentar atributos não considerados.

**RNF-07** — SE o serviço estiver indisponível, ENTÃO O ORIGEM DEVERÁ ocultar as recomendações e manter a navegação principal.

> Nota de rastreabilidade (card 2): o contrato ATUAL do Origem trata a indisponibilidade do módulo de IA com um mecanismo **baseline local no backend** (sugestões locais, `X-Recomendacao-Fonte: baseline`) e não oculta recomendações como o texto antigo do PDF sugeria. O texto do PDF não deve ser lido como exigência de ocultação no contrato atual; o backend não deve ser alterado para esconder sugestões por conta desse trecho histórico.

**RNF-08** — O MÓDULO DE RECOMENDAÇÃO DEVERÁ ser executável em ambiente Linux compatível.

**RNF-09** — Desempenho sob carga: O MÓDULO DE RECOMENDAÇÃO DEVERÁ responder às solicitações em até 2 segundos para, no mínimo, 95% das requisições, considerando um catálogo de até 10.000 produtos ativos.

> Nota de rastreabilidade (card 2): o benchmark interno do repositório mede a lógica de rank (`tests/test_performance.py`) e não demonstra carga HTTP concorrente com banco/serviço real. Não prova, por si só, o SLA HTTP de RNF-09. Validação de SLA HTTP sob carga ainda é necessária.

## Interface de integração — INT-01

Interface HTTP entre o Origem e o Módulo de Recomendação.

- Método: POST
- Endpoint: `/recommendations`
- Entradas: `product_id` (opcional), `category` (opcional), `technique` (opcional), `region` (opcional) e `limit`.
- Saídas: `recommendations[]`, contendo `product_id`, `score` e `reason`.
- Erros: 400 — entrada inválida; 401 — não autenticado; 403 — não autorizado; 404 — produto não encontrado; 500 — erro interno; 503 — serviço indisponível.

## Estratégia, baseline e fallback

- Estratégia principal: recomendação baseada em conteúdo, considerando a correspondência entre categoria, técnica artesanal e região, com cálculo de score e justificativa.
- Baseline: recomendação de produtos disponíveis da mesma categoria, excluindo o produto de referência. Essa abordagem será utilizada como referência de comparação com a estratégia principal.
- Fallback: quando não houver candidatos suficientes com correspondência direta, o módulo deverá ampliar progressivamente os critérios de recomendação, mantendo a exclusão do produto de referência e de produtos indisponíveis. A ordem de fallback será:
  1. Categoria, técnica e região;
  2. Categoria e técnica;
  3. Categoria e região;
  4. Categoria;
  5. Lista vazia, caso não existam candidatos elegíveis.
