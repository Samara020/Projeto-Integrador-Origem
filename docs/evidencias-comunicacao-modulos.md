# Evidências Funcionais — Comunicação entre `backend` e `modulo-ia`

## 1. Rastreabilidade da versão e ambiente executado
- **Commit (SHA):** `93628a1fa677193f818708aa753ecc4cda125542` (`93628a1`)
- **Branch:** `feat/unidade2-paralelismo-benchmarks`
- **Data / Hora (UTC):** `2026-11-25T01:08:49Z` – `2026-11-25T01:09:32Z` (24/11/2026 22:08–22:09 BRT)
- **Máquina / Runtime:** Windows 11 (`10.0.26300-SP0`), `11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz` (4 núcleos físicos / 8 CPUs lógicas), `15,80 GB` RAM, Node.js `v24.19.0`, Python `3.14.7` (host) / `python:3.13-slim` (Docker Compose).
- **Containers ativos no teste:** `origem-postgres` (`:5433`), `origem-modulo-ia-1` (`:3001`), `origem-backend-1` (`:4000`).

## 2. Mecanismo e integração
- **Origem:** `backend/app/src/services/recomendacao.service.ts` (consumindo `backend/app/src/lib/modulo-ia.ts`).
- **Destino:** serviço de recomendação em `modulo-ia/` (`POST /recommendations` via BentoML na porta `3001`, consumido pelo backend na porta `4000`).
- **Configuração:** `RECOMENDACAO_API_URL`, `RECOMENDACAO_API_KEY` e `RECOMENDACAO_TIMEOUT_MS` (`2000 ms`).

## 3. Execução funcional, fallback e reexecução de testes automatizados (SHA `93628a1`)
- **Cenário 1 (`modulo-ia` ativo):** `GET /produtos/recomendacoes?produtoId=2001&limite=4` retornou `HTTP 200`, `X-Recomendacao-Fonte: ia`, `results=4` em **30/30** execuções (mediana `17,694 ms`, P95 `28,195 ms`).
- **Cenário 2 (`modulo-ia` parado via `docker compose stop modulo-ia`):** retornou `HTTP 200`, `X-Recomendacao-Fonte: baseline`, `results=4` em **30/30** execuções com fallback local automático após `RECOMENDACAO_TIMEOUT_MS=2000 ms` (mediana `2.013,959 ms`, P95 `2.026,490 ms`).
- **Reexecução dos testes automatizados de integração (API real contra Docker em execução):**
  - Comando: `npm --prefix frontend run test:api -- tests/api/recomendacoes.test.ts tests/api/modulo-ia.test.ts`
  - Resultado: **2/2 suítes aprovadas, 8/8 testes aprovados em `3,587 s`** (contrato HTTP, autenticação `X-API-Key`, recomendações via `ia` e validação de erros).
- **Reexecução dos testes automatizados do `modulo-ia` (`pytest` no container Docker):**
  - Comando: `docker build --target test --progress=plain ./modulo-ia`
  - Resultado: **33/33 testes aprovados** (equivalência sequencial/paralela, `/recommendations`, `/recommendations/batch` e desempenho P95).

## 4. Benchmark repetido de latência da comunicação distribuída (`90` amostras)
- **Script reproduzível:** [`scripts/benchmark-comunicacao.mjs`](../scripts/benchmark-comunicacao.mjs) (`5` aquecimentos descartados + `30` repetições cronometradas por cenário).
- **Amostras brutas com SHA e ambiente em cada linha:** [`docs/benchmark_comunicacao_brutas.csv`](benchmark_comunicacao_brutas.csv) (`90` registros).

| Cenário | HTTP 200 | Fonte (`X-Recomendacao-Fonte`) | Mediana | Média ± DP | P95 | Mín – Máx | Throughput |
|---|---:|---|---:|---:|---:|---:|---:|
| `ia_direto` (`POST :3001/recommendations`) | 30/30 | `ia_direto` | **10,943 ms** | 11,978 ± 4,700 ms | 20,655 ms | 5,871 – 22,836 ms | 91,4 req/s |
| `backend_com_ia` (`GET :4000/produtos/recomendacoes`) | 30/30 | `ia` | **17,694 ms** | 19,426 ± 4,728 ms | 28,195 ms | 13,658 – 34,151 ms | 56,5 req/s |
| `backend_fallback_baseline` (`modulo-ia` parado) | 30/30 | `baseline` | **2.013,959 ms** | 2.014,869 ± 4,870 ms | 2.026,490 ms | 2.008,477 – 2.027,469 ms | 0,5 req/s |

- Nos logs internos do container `modulo-ia-1`, o cálculo puro de ranqueamento em Python levou **`0,19`–`0,56 ms`** (`elapsed_ms`), e a requisição HTTP dentro do BentoML levou `2,31`–`3,17 ms`. Na queda do serviço, `backend-1` registrou: `[modulo-ia] indisponível ou tempo esgotado; aplicando baseline local: The operation was aborted due to timeout`.

## 5. Arquivos de evidência vinculados
- Logs da comunicação e fallback: [`evidencias-comunicacao/logs-comunicacao.txt`](../evidencias-comunicacao/logs-comunicacao.txt)
- Evidências de paralelismo, `pytest` (`33/33`) e testes de API (`8/8`): [`evidencias-comunicacao/evidencias-paralelismo.txt`](../evidencias-comunicacao/evidencias-paralelismo.txt)
- Dados brutos do benchmark de comunicação: [`docs/benchmark_comunicacao_brutas.csv`](benchmark_comunicacao_brutas.csv)
- Interpretação completa e decisões técnicas: [`docs/relatorio-interpretacao-decisoes-tecnicas.md`](relatorio-interpretacao-decisoes-tecnicas.md)
