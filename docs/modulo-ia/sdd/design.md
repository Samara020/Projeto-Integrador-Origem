# design.md — Projeto do módulo

Extraído de `docs/Baseline de IA.pdf` (seção 2.2, SDD). Coerente com `requirements.md` e `product.md`.

## 2.2.1 Diagrama de componentes

O Origem envia o produto de referência ou os filtros utilizados na consulta ao Módulo de Recomendação (BentoML, `POST /recommendations`), que valida a entrada, consulta candidatos, verifica disponibilidade, compara atributos, calcula a relação, ordena os resultados e retorna as recomendações. O backend do Origem integra a rota `GET /produtos/recomendacoes` e, em caso de indisponibilidade do módulo de IA, aplica o mecanismo baseline local.

## 2.2.2 Fluxo dos dados

O Origem envia o produto de referência ou os filtros utilizados na consulta, juntamente com os atributos disponíveis. O módulo validará a entrada, consultará candidatos, verificará disponibilidade, comparará atributos, calculará a relação entre o contexto e os candidatos, ordenará os resultados e retornará as recomendações.

## 2.2.3 Modelo de dados

Produto: `product_id`, `category`, `technique`, `region`, `availability`.
Recomendação: `product_id`, `score`, `reason`.

## 2.2.4 Estratégia, baseline e fallback

Estratégia principal: recomendação baseada em conteúdo, considerando a correspondência entre categoria, técnica artesanal e região, com cálculo de score e justificativa.

Baseline: recomendação de produtos disponíveis da mesma categoria, excluindo o produto de referência. Essa abordagem será utilizada como referência de comparação com a estratégia principal.

Fallback: quando não houver candidatos suficientes com correspondência direta, o módulo deverá ampliar progressivamente os critérios de recomendação, mantendo a exclusão do produto de referência e de produtos indisponíveis. A ordem de fallback será: 1. Categoria, técnica e região; 2. Categoria e técnica; 3. Categoria e região; 4. Categoria; 5. Lista vazia, caso não existam candidatos elegíveis. O fallback será aplicado até atingir a quantidade solicitada ou até esgotar os critérios disponíveis. Caso não existam candidatos, o módulo deverá retornar uma lista vazia, permitindo que o Origem oculte a seção de recomendações.

Cálculo do score: o score será calculado com base na correspondência dos atributos disponíveis entre o produto de referência e os produtos candidatos. A categoria, a técnica artesanal e a região poderão ser utilizadas na composição da pontuação. A fórmula e os pesos definitivos serão definidos durante a implementação e os testes do módulo.

Pesos de implementação do mockup (atual): categoria 50%, técnica artesanal 30%, região 20%. A pontuação é normalizada considerando os atributos presentes no contexto da recomendação.

## 2.2.5 Interface de integração

POST /recommendations
Entrada: `product_id` (opcional), `category` (opcional), `technique` (opcional), `region` (opcional), `limit`.
Saída: `recommendations[]`, contendo `product_id`, `score` e `reason`.
Erros: 400, 401, 403, 404, 500 e 503.

## 2.2.6 Exemplo de requisição e resposta

Requisição — POST /recommendations
```json
{
    "product_id": "prod_123",
    "limit": 5
}
```

Resposta — HTTP 200
```json
{
    "recommendations": [
        {
            "product_id": "prod_456",
            "score": 0.92,
            "reason": "Mesma técnica artesanal"
        },
        {
            "product_id": "prod_789",
            "score": 0.85,
            "reason": "Mesma categoria"
        }
    ]
}
```

Resposta de erro — HTTP 404
```json
{
    "error": {
        "code": "PRODUCT_NOT_FOUND",
        "message": "Produto de referência não encontrado."
    }
}
```

## 2.2.7 Tratamento de erros e contingência

Entradas inválidas retornam 400. Falhas de autenticação/autorização retornam 401/403. Produto inexistente retorna 404. Falha interna retorna 500. Indisponibilidade retorna 503; nesse caso, o Origem oculta a seção de recomendações.

> Nota de rastreabilidade (card 2): o contrato atual do Origem usa baseline local no backend na indisponibilidade; não se altera o backend para esconder sugestões por conta desse trecho histórico.

## 2.2.8 Segurança, privacidade e observabilidade

Autenticação e autorização na interface; validação das entradas; uso apenas dos dados necessários; métricas de volume, erros e tempo de resposta sem dados pessoais desnecessários.

Logs estruturados implementados (`app/observability.py`): evento `modulo_ia_execucao` (emitido em stdout e também gravado em `modulo-ia/logs/uso_dados.jsonl`, sem chave `funcao`) com `data_hora`, `execucao_id`, `rota`, `status`, `resultado`, `elapsed_ms`, `product_id`, `filtros`, `contexto_referencia`, `origem_catalogo`, `fonte_catalogo`, `motivo_fallback`, `total_catalogo`, `total_candidatos`, `total_analisados`, `total_compativeis`, `total_sugestoes`, `total_referencias`, `total_resultados`, `codigo_erro` e `detalhe`. Log de uso dos dados (`app/data_log.py`): linhas JSONL em `modulo-ia/logs/uso_dados.jsonl` com `data_hora`, `funcao`, `chamador`, `parametros`, `registros`, `status`, `ids`, `fonte`, `erro`, `duracao_ms`, `execucao_id` e `motivo_fallback`. Resumo: `resumo_uso_dados.py` (incluindo seção `execucoes` com requisições, vazias, sugestões, erros e latências).

> Nota de rastreabilidade (cards 2, 43 e 44): os indicadores de filtros aplicados, soma de sugestões no batch, recomendações vazias individuais, falhas PostgreSQL sem vazar credenciais e latências agregadas foram implementados e confirmados pelo reteste independente (272 casos únicos aprovados, conforme `docs/modulo-ia-dados-e-monitoramento.md`). Permanecem fora do escopo do reteste isolado a homologação em banco real, carga HTTP concorrente de SLA (RNF-09) e E2E completo.
