# Módulo de IA — Utilização de Dados e Evidências de Monitoramento

- **Projeto:** Projeto Integrador: Origem
- **Branch:** `feat/modulo-ia-dados`
- **Data:** 2026-11-26

## 1. Estrutura de Dados do Módulo de IA

Foi criado o script idempotente `database/sql/10_estrutura_modulo_ia.sql` no PostgreSQL (`origem_db`), contendo:

- **Índice parcial:** `idx_produto_recomendacao_ativo` sobre `public.produto (status_validacao, excluido, pausado, fk_categoria_id_categoria, fk_loja_id_loja)` onde `NOT excluido AND NOT pausado`.
- **View:** `public.vw_catalogo_recomendacao_ia`, consolidando `produto`, `categoria`, `loja` e `estoque` com os campos esperados pelo recomendador (`product_id`, `name`, `category`, `technique`, `region`, `available`, além de `preco`, `selo_ativo`, `quantidade_disponivel`, `id_loja` e `id_categoria`).
- **Regra de disponibilidade (`available`):** `NOT p.excluido AND NOT p.pausado AND UPPER(TRIM(p.status_validacao)) = 'APROVADA' AND COALESCE(e.quantidade_disponivel, 0) > 0`.

## 2. Validação dos Dados Utilizados pela IA

Na auditoria executada sobre `public.vw_catalogo_recomendacao_ia`:

- **Total de itens:** 15 (`13` disponíveis e `2` indisponíveis).
- **Campos nulos/vazios em itens disponíveis:** `0` sem categoria, `0` sem técnica e `0` sem região.
- **Integridade numérica:** `0` itens com `preco <= 0` ou `quantidade_disponivel < 0`.
- **Observação de padronização:** identificada variação de capitalização/granularidade em `region` (`"pernambuco"` com `0` disponíveis frente a padrões como `"Agreste - PE"`, `"Zona da Mata - PE"`, `"Sertão do São Francisco - PE"` e `"Sertão do Pajeú - PE"`). A comparação no recomendador já normaliza via `strip().casefold()`.

## 3. Acesso a Dados, Integração e Logs de Execução

- **Camada de acesso (`modulo-ia/app/repository.py`):** implementa `fetch_catalog_from_db`, `get_catalog_items`, `get_repository_product` e `get_repository_available_products`, priorizando catálogo explícito no payload, tentando a leitura da view no PostgreSQL e realizando *fallback* automático para o catálogo JSON local (`load_catalog()`) quando o banco/driver não está disponível.
- **Integração (`modulo-ia/app/service.py`):** endpoints `POST /recommendations` e `POST /recommendations/batch` no BentoML (`:3001`) integrados à camada de repositório.
- **Logs estruturados (`modulo-ia/app/observability.py`):** emissão de eventos JSON `modulo_ia_execucao` com `rota`, `status`, `elapsed_ms`, `product_id`, `origem_catalogo`, `total_resultados` e `codigo_erro`.

## 4. Testes e Evidências de Monitoramento

- **Build e testes unitários:** 33 testes aprovados no build do `modulo-ia` e asserções unitárias de `repository.py` e `observability.py` aprovadas.
- **Testes HTTP:** validação de `401` sem `X-API-Key`, `404` para produto inexistente e `200` em `/recommendations` e `/recommendations/batch`.

### Resumo de Latência e Execuções (`modulo_ia_execucao`)

| Rota e Status | Quantidade | Latência Média (`avg_ms`) | Latência Máxima (`max_ms`) |
| :--- | :---: | :---: | :---: |
| `/recommendations`, `sucesso` | 6 | 0,51 ms | 0,71 ms |
| `/recommendations`, `erro` | 3 | 0,14 ms | 0,31 ms |
| `/recommendations/batch`, `sucesso` | 2 | 0,90 ms | 0,93 ms |

### Consumo de Recursos (`docker stats --no-stream`)

| Contêiner | CPU % | Memória (`MEM USAGE / LIMIT`) | Mem % |
| :--- | :---: | :---: | :---: |
| `origem-modulo-ia-1` | 0,37% | 141 MiB / 6,664 GiB | 2,07% |
| `origem-postgres` | 8,07% | 52,64 MiB / 6,664 GiB | 0,77% |
| `origem-backend-1` | 0,05% | 79 MiB / 6,664 GiB | 1,16% |
