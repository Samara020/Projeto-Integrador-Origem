# Módulo de IA — Utilização de Dados e Evidências de Monitoramento

- **Projeto:** Projeto Integrador: Origem
- **Branch:** `feat/modulo-ia-dados`
- **Data:** 2026-11-27

## 1. Estrutura de Dados do Módulo de IA

Foi criado o script idempotente `database/sql/10_estrutura_modulo_ia.sql` no PostgreSQL (`origem_db`), contendo:

- **Índice parcial:** `idx_produto_recomendacao_ativo` sobre `public.produto (status_validacao, excluido, pausado, fk_categoria_id_categoria, fk_loja_id_loja)` onde `NOT excluido AND NOT pausado`.
- **View:** `public.vw_catalogo_recomendacao_ia`, consolidando `produto`, `categoria`, `loja` e `estoque` com os campos esperados pelo recomendador (`product_id`, `name`, `category`, `technique`, `region`, `available`, além de `preco`, `selo_ativo`, `quantidade_disponivel`, `id_loja` e `id_categoria`).
- **Regra de disponibilidade (`available`):** `NOT p.excluido AND NOT p.pausado AND UPPER(TRIM(p.status_validacao)) = 'APROVADA' AND COALESCE(e.quantidade_disponivel, 0) > 0`.

## 2. Validação dos Dados e Consistência entre Fontes

Na auditoria executada sobre `public.vw_catalogo_recomendacao_ia` e os arquivos JSON de `modulo-ia/data/`:

- **Seed oficial (`database/sql/05_seed_dados_reais.sql`) e catálogo JSON de referência (`modulo-ia/data/catalogo_origem.json`):** o catálogo JSON versão corrente tem `15` produtos (`prd_201`–`prd_215`), sendo `13` disponíveis e `2` indisponíveis. O `catalogo_origem.json` atua como *fallback* local quando a conexão com o banco não está ativa. O `prd_215` existe somente no JSON (caso mock sem semelhante); não há equivalente no seed do PostgreSQL.
- **PostgreSQL (`public.vw_catalogo_recomendacao_ia` no `origem_db`) e reprodução do item `2015`:** o seed oficial permanece com os 14 produtos (`2001`–`2014`). O 15.º registro (`id_produto = 2015`, `"Xicara de Barro"`, `SKU ORG-002015`, `status_validacao = REPROVADA`, `available = false`, `region = "pernambuco"`) foi criado via fluxo da aplicação em `2026-11-23` (não fazendo parte do seed inicial de 14 itens) e pode ser reproduzido criando um produto na aplicação ou executando um `INSERT` isolado em `produto` e `estoque` no `origem_db` após o seed.
- **Catálogo JSON sintético (`modulo-ia/data/catalogo.json`):** 8 produtos utilizados exclusivamente pela suíte de testes automatizados (`CATALOGO_IA`).
- **Completude:** `0` registros disponíveis sem `category`, `technique` ou `region`; `0` registros com `preco <= 0` ou `quantidade_disponivel < 0`.
- **Convenção de região e normalização:** o PostgreSQL (`vw_catalogo_recomendacao_ia`) possui regiões como `Agreste - PE`, `Zona da Mata - PE`, `Sertão do São Francisco - PE` e `Sertão do Pajeú - PE` (além de `"pernambuco"` no item `2015`), enquanto `catalogo_origem.json` mantém `Agreste`, `Zona da Mata`, `Sertão do São Francisco` e `Sertão do Pajeú` para compatibilidade com os testes existentes; o motor de recomendação realiza comparação normalizada (`strip().casefold()`).

## 3. Acesso a Dados, Integração e Logs de Execução

- **Camada de acesso (`modulo-ia/app/repository.py`):** implementa `fetch_catalog_from_db`, `get_catalog_items`, `get_repository_product`, `get_repository_products_by_ids`, `get_repository_available_products` e `get_repository_filtered_products`. Prioriza catálogo explícito no payload, tenta a leitura da view no PostgreSQL e realiza *fallback* automático para o catálogo JSON local (`load_catalog()`) quando o banco/driver não está disponível. Todas as funções gravam uma linha no log de uso dos dados (`app/data_log.py`).
- **Integração (`modulo-ia/app/service.py`):** endpoints `POST /recommendations` e `POST /recommendations/batch` no BentoML (`:3001`) integrados à camada de repositório. Valida autenticação (`X-API-Key`), limite (`1` a `20`) e presença de produto de referência ou filro. Devolve `404 PRODUCT_NOT_FOUND` para referência inexistente e `503` quando `MOCK_SERVICE_UNAVAILABLE=true` (simulação de indisponibilidade).
- **Log de execução das rotas (`modulo-ia/app/observability.py`):** emissão de eventos JSON `modulo_ia_execucao` para saída padrão com `data_hora` (ISO com ms), `execucao_id`, `rota`, `status` (sucesso|erro), `resultado` (com_sugestoes|vazio|erro), `elapsed_ms`, `product_id`, `filtros` efetivos, `contexto_referencia`, `origem_catalogo`, `fonte_catalogo`, `motivo_fallback`, `total_catalogo`, `total_candidatos`, `total_analisados`, `total_compativeis`, `total_sugestoes`, `total_resultados` (compatível), `codigo_erro`/`detalhe` quando aplicável. Em batch: `total_referencias` separado da soma `total_sugestoes`; `total_resultados`/`total_products` mantêm a semântica anterior de quantidade de referências. O JSON de resposta pública não foi alterado para acomodar métricas.
- **Log de uso dos dados (`modulo-ia/app/data_log.py`):** linhas JSONL em `modulo-ia/logs/uso_dados.jsonl` (caminho sobrescritível por `LOG_USO_DADOS`) com `data_hora`, `funcao`, `chamador`, `parametros`, `registros`, `status`, `ids`, `fonte`, `erro`, `duracao_ms`, `execucao_id` e `motivo_fallback`. Só identificadores, nunca dados pessoais. Falha PostgreSQL: `funcao=fetch_catalog_from_db`, `status=erro`, `erro=postgres_falha: <TipoExcecao>`, sem DSN/credenciais.
- **Resumo de uso (`modulo-ia/resumo_uso_dados.py`):** mantém `por_funcao` e leitura de arquivos antigos; adiciona `execucoes` com contagem de requisições, sucesso, erro, vazias, sugestões, `por_rota`, `latencia_ms` e `latencia_consultas_ms` (amostras/media/p95/max). Eventos de execução não contam como chamadas a funções.

## 4. Testes e Evidências de Monitoramento

### Resultados reais do reteste independente (Agente de teste)

Execução em container descartável (`docker run --network none`, fontes montadas somente para leitura), branch `feat/modulo-ia-dados`, SHA base `c440cea49be71c247df9e6c1109e09ec49a9a433`. Ambiente: Python 3.13.18, BentoML 1.4.39, Pydantic 2.14.4, psycopg 3.3.9, pytest 9.1.1.

| Suíte | Comando | Resultado | Tempo | Saída |
|---|---|---|---|---|
| `logica` | `pytest tests --ignore=tests/test_api.py -p no:cacheprovider --junitxml=logica.xml` | **38 passed**, exit 0 | 19,14 s | `pytest-logica.log`, `logica.xml` |
| `dados` | `pytest tests_dados -p no:cacheprovider --junitxml=dados.xml` | **224 passed**, exit 0 | 2,09 s | `pytest-dados.log`, `dados.xml` |
| `api` | `pytest tests/test_api.py -p no:cacheprovider --junitxml=api.xml` | **10 passed**, exit 0 | 4,14 s | `pytest-api.log`, `api.xml` |

**Total: 272 casos únicos (38 + 224 + 10), todos com código de saída 0.** Destes, 237 eram casos anteriores e 35 são novos (testes de monitoramento e regressão adicionados pelo Agente de teste). Os relatórios JUnit, logs de stdout e o script de execução estão em `/tmp/origem-correcao-ia-20261127/`.

> Aviso de contagem: não somar os testes do build Docker aos da execução de container. O build já executa as mesmas suítes; somá-las duplicaria os casos (não é 544).

### Build Docker (estágio `test`)

Imagem `origem-ia-correcao-teste:20261127`, build com `docker build --target test` (rede apenas para instalação de dependências; runtime sem rede):

| Estágio | Comando | Resultado | Saída |
|---|---|---|---|
| `test` | `pytest tests -p no:cacheprovider -q` | **48 passed**, exit 0 | `docker-build-test-rede.log` (#11) |
| `test` | `pytest tests_dados -p no:cacheprovider -q` | **224 passed**, exit 0 | `docker-build-test-rede.log` (#12) |

O estágio `test` executa `tests` + `tests_dados` dentro da imagem, confirmando que o build de testes realmente roda as duas suítes.

### Manifesto de integridade

SHA base: `c440cea49be71c247df9e6c1109e09ec49a9a433`, branch `feat/modulo-ia-dados`.
Manifesto de 35 arquivos verificados antes/durante/depois do reteste: `/tmp/origem-correcao-ia-20261127/congelado/manifest.json` (SHA `6c3c0eb44196de5adab7e53b6735f46e62ca00eb4c40cf4e4e4f404c9b299379`, fingerprint `0b9cbe3a546ccc0559ff5a3288157f98b37e416361921a52696260fddb55b1e4`). Não houve drift de arquivos rastreados.

### Limites de SLA e testes (não comprovados como SLA de produção)

- **RNF-01:** tempo de resposta de até 1 segundo em condições normais.
- **RNF-09:** desempenho sob carga — até 2 segundos para, no mínimo, 95% das requisições, considerando catálogo de até 10.000 produtos ativos.

> O benchmark interno do repositório mede a lógica de rank (`tests/test_performance.py`) e não demonstra carga HTTP concorrente com serviço/banco reais. Não prova, por si só, o SLA HTTP de RNF-09. Validação de SLA HTTP sob carga ainda é necessária. Os números de latência abaixo são amostras de uma execução local, não evidência de conformidade com SLA.

### Resumo de Latência e Execuções (`modulo_ia_execucao`) — amostra local

| Rota e Status | Quantidade | Latência Média (`avg_ms`) | Latência Máxima (`max_ms`) |
| :--- | :---: | :---: | :---: |
| `/recommendations`, `sucesso` | 6 | 0,51 ms | 0,71 ms |
| `/recommendations`, `erro` | 3 | 0,14 ms | 0,31 ms |
| `/recommendations/batch`, `sucesso` | 2 | 0,90 ms | 0,93 ms |

### Consumo de Recursos (`docker stats --no-stream`) — amostra local

| Contêiner | CPU % | Memória (`MEM USAGE / LIMIT`) | Mem % |
| :--- | :---: | :---: | :---: |
| `origem-modulo-ia-1` | 0,37% | 141 MiB / 6,664 GiB | 2,07% |
| `origem-postgres` | 8,07% | 52,64 MiB / 6,664 GiB | 0,77% |
| `origem-backend-1` | 0,05% | 79 MiB / 6,664 GiB | 1,16% |

### Resumo consolidado do reteste

**272 casos únicos aprovados (38 lógica + 224 dados + 10 API), exit 0 em todas as suítes.** Destes, 237 são casos anteriores e 35 são novos (testes de monitoramento e regressão adicionados pelo Agente de teste). Não houve regressão: os 33 testes do build original continuam aprovados dentro das suítes acima. O build Docker estágio `test` passou 48 (tests) + 224 (tests_dados) sem somar duplicado aos 272 da execução de container.

Eventos reais coletados em `/tmp/origem-correcao-ia-20261127/execution-events.json` (quatro servidores descartáveis: `servidor-ia0`, `servidor-ia1`, `servidor-ia2` e `pytest-api`), manifesto sem drift em `/tmp/origem-correcao-ia-20261127/congelado/manifest.json`. Evidências históricas preservadas; nenhuma sobrescrita como nova.

Sem teste de banco real, SLA sob carga, E2E ou deploy nesta rodada. Os limites de RNF-01/RNF-09 permanecem como requisitos a validar, não como conformidade comprovada.

## 5. Comandos reproduzíveis de coleta e interpretação

Coletar e interpretar eventos, latência, erros/fallbacks e vazios do módulo de IA. Todos rodam com o serviço BentoML em `http://localhost:3001` e a chave `origem-mockup-key`.

**Importante — contagem de linhas por requisição:** nem toda requisição gera acessos a função. Autenticação/validação rejeitadas antes do acesso (401, 403, INVALID_LIMIT) produzem apenas o evento de execução. Exemplos observados no reteste (eventos reais em `/tmp/origem-correcao-ia-20261127/execution-events.json`):

- **Produto normal (`prd_201`, categoria+técnica+região):** 2 acessos (`get_catalog_items`, `get_repository_product`) + 1 evento `modulo_ia_execucao` (`resultado=com_sugestoes`, `total_sugestoes=3`, `total_resultados=3`, `elapsed_ms=1.58`).
- **Filtro apenas (`technique=Cerâmica`):** 1 acesso (`get_catalog_items`) + 1 evento (`resultado=com_sugestoes`, `total_sugestoes=5`, `total_resultados=5`, `elapsed_ms=0.47`).
- **Produto sem semelhante (`prd_215`):** 2 acessos + 1 evento (`resultado=vazio`, `total_sugestoes=0`, `total_resultados=0` — vazio, não erro).
- **Referência inexistente (`prd_999`):** 2 acessos (o segundo com `status=erro`) + 1 evento (`codigo_erro=PRODUCT_NOT_FOUND`).
- **Batch (`[prd_201, prd_215]`, limite 5):** 2 acessos (`get_catalog_items`, `get_repository_products_by_ids`) + 1 evento (`total_sugestoes=5`, `total_referencias=2`, `total_resultados=2` — `total_resultados` conta referências, não a soma de sugestões).
- **Falha PostgreSQL (mock `OperationalError`):** linha `fetch_catalog_from_db` com `erro=postgres_falha: OperationalError` (sem DSN/credenciais), fallback para JSON, e evento de execução com `resultado=com_sugestoes`.
- **Catálogo JSON inválido:** linha `get_catalog_items` com `status=erro` e evento `modulo_ia_execucao` com `codigo_erro=ValueError`.
- **Autenticação/limite inválido:** apenas o evento de execução com `codigo_erro=AUTHENTICATION_REQUIRED`/`FORBIDDEN`/`INVALID_LIMIT`, sem acesso a função de dados.

### 1. Levantar o serviço (mockup, sem banco):
```bash
cd modulo-ia
export PYTHONPATH="$PWD"
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export LOG_USO_DADOS="$PWD/logs/uso_dados.jsonl"
bentoml serve app.service:RecommendationService --port 3001
```

### 2. Chamada individual de produto de referência (caso normal):
```bash
curl -s -X POST http://localhost:3001/recommendations \
  -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" \
  -d '{"product_id": "prd_201", "limit": 5}'
```
Interpretação: HTTP 200 com `recommendations[]` (score/reason). Evento `modulo_ia_execucao` com `status=sucesso`, `resultado=com_sugestoes`, `elapsed_ms`, `total_catalogo=15`, `total_candidatos=12`, `total_analisados=12`, `total_compativeis=3`, `total_sugestoes=3`, `total_resultados=3`, `filtros` com categoria/técnica/região, `contexto_referencia`, `origem_catalogo=repository_or_json`, `fonte_catalogo=json`, `motivo_fallback=dsn_nao_configurado`. Linhas do JSONL: `get_catalog_items` e `get_repository_product` (`chamador=POST /recommendations`), cada uma com `duracao_ms` e `execucao_id` compartilhados com o evento.

### 3. Chamada por filtros apenas (sem referência):
```bash
curl -s -X POST http://localhost:3001/recommendations \
  -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" \
  -d '{"category": "Literatura", "limit": 5}'
```
Interpretação: HTTP 200. O evento `modulo_ia_execucao` registra `filtros` com categoria/técnica/região aplicados (pendência do card 43 resolvida: o caminho HTTP agora registra os filtros efetivos no evento de execução). Linha do JSONL: `get_catalog_items` (1 acesso).

### 4. Produto sem semelhante e referência inexistente:
```bash
curl -s -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_215", "limit": 5}'
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_999", "limit": 5}'
```
Interpretação: `prd_215` → `{"recommendations": []}` (vazio, não erro; evento com `resultado=vazio`, `total_sugestoes=0`, `total_resultados=0`). `prd_999` → 404 `PRODUCT_NOT_FOUND`; JSONL grava `status=erro` com `erro=produto nao encontrado: prd_999` e o evento grava `codigo_erro=PRODUCT_NOT_FOUND`.

### 5. Chamada em lote:
```bash
curl -s -X POST http://localhost:3001/recommendations/batch \
  -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" \
  -d '{"product_ids": ["prd_201","prd_215"], "limit": 5}'
```
Interpretação: `total_referencias=2` (contagem de referências), `total_sugestoes=5` (soma de sugestões por referência), `total_resultados=2` (semântica anterior de referências). Não confundir `total_resultados` com `total_sugestoes`.

### 6. Simular indisponibilidade (fallback 503) e catálogo inválido:
```bash
MOCK_SERVICE_UNAVAILABLE=true bentoml serve app.service:RecommendationService --port 3001
curl -s -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_201", "limit": 5}'
```
Interpretação: HTTP 503 `SERVICE_UNAVAILABLE`. O contrato atual do Origem trata indisponibilidade com baseline local no backend; não se esconde sugestões por conta do texto histórico do PDF. Falha PostgreSQL (mock) aparece como erro no JSONL (`fetch_catalog_from_db`, `erro=postgres_falha: OperationalError`) — pendência do card 43 resolvida para falha de fonte.

### 7. Ver o resumo de uso dos dados:
```bash
python resumo_uso_dados.py --log logs/uso_dados.jsonl --catalogo data/catalogo_origem.json
```
Interpretação: chamadas por função/status, quem chamou, erros com motivo, produtos mais consultados, nunca consultados e ids inexistentes; agora também `execucoes` com `requisicoes`, `sucesso`, `erro`, `vazias`, `sugestoes`, `por_rota`, `latencia_ms` e `latencia_consultas_ms`.

### 8. Ver o evento de execução (saída padrão do serviço):
Acompanhe o terminal do serviço para os eventos JSON `modulo_ia_execucao` com todos os campos acima (data_hora, execucao_id, rota, status, resultado, elapsed_ms, product_id, filtros, contexto_referencia, origem_catalogo, fonte_catalogo, motivo_fallback, total_*, codigo_erro/detalhe). Cada execução tem um `execucao_id` que correlaciona o evento de rota com as linhas de acesso do JSONL.

### Limites de teste a observar
- `elapsed_ms` de cada chamada deve estar abaixo de 1s (RNF-01) em condições normais (amostra local, não SLA comprovado).
- Sob carga, ≥95% das requisições devem responder em ≤2s (RNF-09) — ainda a validar com carga HTTP real.
- Casos esperados: `prd_215` → lista vazia (não erro); `prd_999` → 404; tipos inválidos → 400 (Pydantic).

### Definição de contadores (conforme contrato de eventos, após congelamento dos arquivos IA)

- **`total_candidatos`** e **`total_analisados`**: candidatos examinados — todos os produtos disponíveis sem o produto de referência.
  - No catálogo sintético do teste (IDs `p1`..`p6`): `total_candidatos=total_analisados=4`.
  - No catálogo corrente JSON (`catalogo_origem.json`, 15 produtos): para referência `prd_201`, `total_candidatos=total_analisados=12`.
- **`total_compativeis`**: dentre os analisados, os que casam o filtro mais amplo do fallback — categoria (ou, sem categoria, técnica ou região).
  - No catálogo sintético do teste: `total_compativeis=3`.
  - No catálogo corrente JSON para `prd_201`: `total_compativeis=3`.
- **`total_sugestoes`**: recomendações efetivamente devolvidas após ordenação e limite (batch: soma por referência; individual: itens de `recommendations[]`).
- **`total_resultados`**: mantém a semântica anterior (quantidade de referências no batch; contagem de resultados na individual). Não confundir com `total_sugestoes`.

### Chaves do resumo de execução (`resumo['execucoes']`)

`requisicoes`, `sucesso`, `erro`, `vazias`, `sugestoes`, `por_rota`, `latencia_ms`, `latencia_consultas_ms{amostras, media, p95, max}`. Eventos de execução não contam como chamadas a funções (mantêm compatibilidade com as linhas de acesso do JSONL, que incluem `duracao_ms`).

## 6. Escopo fora desta entrega

Não foram implementados, e não entram nesta rodada: cache de catálogo com TTL/invalidação (card 21), processamento assíncrono de pedidos com consumidor integrado e repetição (card 20), e mensageria. Cada um tem escopo e decisão separados.