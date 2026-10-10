# Módulo de Recomendação de Produtos — Origem

Mockup executável do módulo de recomendação de produtos do marketplace Origem.

O módulo implementa uma estratégia de recomendação baseada em conteúdo, utilizando atributos dos produtos para calcular uma pontuação de relacionamento, ordenar candidatos e retornar recomendações justificadas.

## Tecnologias

- Python 3.13+
- BentoML 1.4.39
- Pydantic
- pytest 9.1.1
- requests 2.34.2

## Estrutura

modulo-ia/
├── app/
│   ├── config.py
│   ├── catalog.py
│   ├── fallback.py
│   ├── recommendation.py
│   └── service.py
├── data/
│   └── catalogo.json
├── tests/
│   ├── test_api.py
│   ├── test_performance.py
│   ├── test_recommendation.py
│   └── test_service.py
├── requirements.txt
└── README.md

## Instalação

Na raiz do projeto:

    python -m venv .venv-ia
    .\.venv-ia\Scripts\Activate.ps1
    pip install -r modulo-ia\requirements.txt

No Linux:

    python3 -m venv .venv-ia
    source .venv-ia/bin/activate
    pip install -r modulo-ia/requirements.txt

## Configuração

O módulo utiliza a variável PYTHONPATH para localizar o pacote app.

No PowerShell:

    $env:PYTHONPATH="$PWD\modulo-ia"

No Linux:

    export PYTHONPATH="$PWD/modulo-ia"

## Execução

Com o ambiente virtual ativado, entre na pasta do módulo e suba o serviço na porta 3001
(a 3000 é do frontend Next.js):

    cd modulo-ia
    bentoml serve app.service:RecommendationService --port 3001

O serviço será disponibilizado em:

    http://localhost:3001

## Endpoint

POST /recommendations

### Autenticação

A API utiliza a chave:

    X-API-Key: origem-mockup-key

### Requisição

Exemplo:

    {
      "product_id": "prd_201",
      "limit": 5
    }

Também é possível utilizar filtros:

    {
      "category": "Cerâmica",
      "technique": "Modelagem manual",
      "region": "Caruaru",
      "limit": 5
    }

O limit possui valor padrão 5 e aceita valores entre 1 e 20.

## Resposta

Exemplo:

    {
      "recommendations": [
        {
          "product_id": "prod_002",
          "score": 1.0,
          "reason": "Recomendado por mesma categoria, mesma técnica artesanal, mesma região."
        },
        {
          "product_id": "prod_004",
          "score": 0.8,
          "reason": "Recomendado por mesma categoria, mesma técnica artesanal."
        }
      ]
    }

## Estratégia de recomendação

A recomendação utiliza os atributos:

- categoria;
- técnica artesanal;
- região.

Os pesos utilizados na implementação são:

| Atributo | Peso |
|---|---:|
| Categoria | 50% |
| Técnica | 30% |
| Região | 20% |

O score é calculado somente sobre os atributos disponíveis no contexto.

A implementação ordena os candidatos pelo score em ordem decrescente.

## Filtros aplicados

O módulo:

1. considera somente produtos disponíveis;
2. exclui o produto utilizado como referência;
3. compara os atributos disponíveis;
4. calcula o score;
5. ordena os resultados;
6. retorna a quantidade solicitada.

## Fallback

Quando não existem candidatos suficientes utilizando todos os atributos, o módulo reduz progressivamente os critérios:

1. categoria + técnica + região;
2. categoria + técnica;
3. categoria + região;
4. categoria;
5. lista vazia.

O produto de referência e produtos indisponíveis continuam excluídos em todas as etapas.

## Justificativas

Cada recomendação possui uma justificativa baseada nos atributos efetivamente utilizados no cálculo.

Exemplo:

    Recomendado por mesma categoria, mesma técnica artesanal.

## Códigos HTTP

| Código | Situação |
|---:|---|
| 200 | Recomendação processada |
| 400 | Requisição ou limite inválido |
| 401 | Autenticação ausente |
| 403 | Credencial inválida ou sem autorização |
| 404 | Produto de referência inexistente |
| 500 | Erro interno simulado |
| 503 | Serviço indisponível simulado |

## Testes

Os testes de lógica usam o catálogo sintético (`data/catalogo.json`), configurado
automaticamente em `tests/conftest.py`. O `test_api.py` fala com o servidor em
`http://localhost:3001` (mude com a variável `IA_BASE_URL`) e usa os IDs do site.

Com o BentoML executando em outro terminal:

    pytest modulo-ia\tests -v

Resultados validados:

    15 passed

O teste de desempenho foi executado com 10.000 produtos e 20 execuções da lógica de recomendação.

Resultado:

    P95: 0,0305s
    Catálogo: 10.000 produtos
    Execuções: 20
    Limite RNF-09: 2s
    Resultado: PASS

Os testes cobrem:

- exclusão do produto de referência;
- exclusão de produtos indisponíveis;
- cálculo de score;
- ordenação;
- fallback;
- ausência de candidatos;
- autenticação;
- autorização;
- limite inválido;
- produto inexistente;
- comunicação HTTP;
- configuração dos cenários de indisponibilidade e erro interno;
- teste de desempenho com catálogo de 10.000 produtos;
- validação do percentil 95 (P95) abaixo de 2 segundos.

O cenário HTTP de indisponibilidade 503 também foi validado manualmente com o servidor BentoML.

## Relação com os requisitos do AV1

| Requisito | Implementação |
|---|---|
| RF-01 | RecommendationRequest recebe produto ou filtros |
| RF-02 | select_candidates() seleciona candidatos |
| RF-03 | available_products() mantém somente produtos disponíveis |
| RF-04 | produto de referência é excluído |
| RF-05 | categoria, técnica e região são comparadas |
| RF-06 | calculate_score() calcula o relacionamento |
| RF-07 | rank_candidates() ordena os resultados |
| RF-08 | limite padrão 5 e máximo 20 |
| RF-09 | build_reason() gera justificativa |
| RF-10 | FALLBACK_STAGES implementa fallback |
| RF-11 | retorna lista vazia quando não há candidatos |
| RF-12 | endpoint HTTP /recommendations |
| RNF-01 | serviço configurado com timeout de 2 segundos |
| RNF-02 | validação por Pydantic e regras do serviço |
| RNF-03 | autenticação e autorização por X-API-Key |
| RNF-04 | catálogo utiliza somente atributos necessários |
| RNF-05 | log registra quantidade e tempo sem dados pessoais |
| RNF-06 | justificativa corresponde aos atributos comparados |
| RNF-07 | indisponibilidade pode ser simulada com resposta 503 |
| RNF-08 | execução baseada em Python/BentoML |
| RNF-09 | teste com 10.000 produtos e 20 execuções apresentou P95 de 0,0305s, abaixo do limite de 2s |

## Catálogo

O módulo trabalha com dois catálogos em `data/`:

| Arquivo | Uso |
|---|---|
| `catalogo_origem.json` | Padrão. Espelha as peças da Fake API do frontend (`frontend/src/mocks`), com os mesmos IDs `prd_` |
| `catalogo.json` | Catálogo sintético dos testes de lógica (`prod_001`...) |

Para escolher outro arquivo, defina `CATALOGO_IA` com o caminho dele.

Em `catalogo_origem.json`, categoria, técnica e região são os nomes exibidos no site,
e `available` é `true` só para peças com disponibilidade `DISPONIVEL`
(reservadas e vendidas não são recomendadas). Se as peças da Fake API mudarem,
atualize este arquivo também.

## Integração com o site

A rota `GET /produtos/recomendacoes` do frontend
(`frontend/src/app/api/produtos/recomendacoes/route.ts`) chama este módulo quando
`RECOMENDACAO_API_URL` está definida em `frontend/.env.local`:

    RECOMENDACAO_API_URL=http://localhost:3001
    RECOMENDACAO_API_KEY=origem-mockup-key

Fluxo:

1. a página do produto pede `/api/produtos/recomendacoes?produtoId=prd_201`;
2. a rota envia `POST /recommendations` com `product_id` e `limit: 4`;
3. os IDs devolvidos viram cartões, e o `reason` vira o campo `motivo`, mostrado no cartão;
4. se o módulo falhar ou passar de 2 s, a rota usa o baseline local e a página continua funcionando.

O cabeçalho `X-Recomendacao-Fonte` da resposta diz de onde veio a lista (`ia` ou `baseline`).

## Limitações do mockup

Esta implementação é um protótipo executável para demonstração da lógica e da interface do módulo.

Não contempla:

- banco de dados de produção;
- autenticação integrada ao sistema Origem;
- alteração de estoque;
- pagamentos;
- pedidos;
- cadastro de produtos;
- gerenciamento de preços;
- infraestrutura de produção;
- modelo de machine learning treinado.

O score e seus pesos são decisões de implementação do mockup e podem ser substituídos ou calibrados em uma implementação futura.

## Execução rápida

Terminal 1 (IA):

    .\.venv-ia\Scripts\Activate.ps1
    cd modulo-ia
    bentoml serve app.service:RecommendationService --port 3001

Terminal 2 (site), com `frontend/.env.local` copiado de `frontend/.env.example`:

    cd frontend
    npm run dev

Terminal 3 (testes):

    .\.venv-ia\Scripts\Activate.ps1
    $env:PYTHONPATH="$PWD\modulo-ia"
    pytest modulo-ia\tests -v