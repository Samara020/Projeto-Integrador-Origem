# Medição do Ganho Obtido com o Paralelismo — Recomendações (`modulo-ia`)

## 1. Ambiente, máquina e metodologia
- **Data de referência:** 24 de novembro de 2026 (`2026-11-24`, `17:42:54 UTC`).
- **Máquina / ambiente de execução:**
  - **SO:** Microsoft Windows 11 (`10.0.26300-SP0`, PowerShell)
  - **CPU:** `11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz` (`2419 MHz`, 4 núcleos físicos / 8 CPUs lógicas)
  - **Memória RAM:** `15,80 GB`
  - **Runtime:** Python `3.14.7` (reprodutível via `cd modulo-ia && python -m benchmark_parallel`)
  - **Estado de carga:** execução local dedicada, sem outros benchmarks concorrentes.
- **Métricas coletadas:** latência (mediana, média e desvio padrão em `ms`), **throughput** (`produtos/s` no lote e `candidatos/s` no ranqueamento unitário), *speedup* e redução percentual de tempo.
- **Tarefas reais medidas do produto (`modulo-ia/app/recommendation.py`, integradas em `app/fallback.py` e `app/service.py`):**
  1. **Cenário 1 — Ranqueamento unitário:** `rank_candidates` (sequencial) vs. `rank_candidates_parallel` (`ThreadPoolExecutor` reutilizado, `w=2` e `w=4`) para `100`, `1.000` e `5.000` candidatos.
  2. **Cenário 2 — Pré-cálculo de recomendações em lote (`POST /recommendations/batch`):** `rank_batch_recommendations` (sequencial) vs. `rank_batch_recommendations_parallel` com `ThreadPoolExecutor` (`w=4`) e `ProcessPoolExecutor` (`w=2` e `w=4`, catálogo carregado uma única vez por processo via `initializer`) para lotes de `200`, `500` e `1.000` produtos de referência sobre catálogo de `1.000` peças (top-5 por produto).
- **Aquecimento e repetições:** `2` execuções preliminares de aquecimento (*warm-up*) descartadas + `7` repetições cronometradas com `time.perf_counter()` (`147` amostras brutas em `docs/benchmark_amostras_brutas.csv`).

## 2. Fórmulas aplicadas sobre a mediana
- `Speedup = T_sequencial / T_paralelo`
- `Throughput = Volume / (T_mediana_ms / 1000)`
- `Variação (%) = ((T_sequencial - T_paralelo) / T_sequencial) * 100`
- `Redução de tempo (%) = max(0, Variação (%))`

## 3. Cenário 2 (Principal — ganho real comprovado): Pré-cálculo de recomendações em lote (`ProcessPoolExecutor`)

Catálogo de `1.000` peças; pré-cálculo das 5 melhores recomendações por produto (`min_requests_for_parallel=16`, pool reutilizado com `initializer`):

| Lote | Modo / Executor | Latência Mediana | Latência Média ± Desvio Padrão | Throughput | Speedup | Variação / Redução |
|---:|---|---:|---:|---:|---:|---:|
| **200 prod.** | Sequencial (`w=1`) | 1.319,69 ms | 1.301,45 ± 270,83 ms | 151,6 prod/s | 1,00x | base |
| **200 prod.** | Paralelo `thread` (`w=4`, GIL) | 1.725,39 ms | 1.774,51 ± 172,21 ms | 115,9 prod/s | 0,76x | -30,74% (0,00%) |
| **200 prod.** | Paralelo `process` (`w=2`) | **575,15 ms** | 744,89 ± 297,57 ms | **347,7 prod/s** | **2,29x** | **+56,42% (redução: 56,42%)** |
| **200 prod.** | Paralelo `process` (`w=4`) | **364,08 ms** | 391,81 ± 67,36 ms | **549,3 prod/s** | **3,62x** | **+72,41% (redução: 72,41%)** |
| **500 prod.** | Sequencial (`w=1`) | 3.498,87 ms | 3.432,82 ± 180,11 ms | 142,9 prod/s | 1,00x | base |
| **500 prod.** | Paralelo `thread` (`w=4`, GIL) | 4.464,93 ms | 4.557,00 ± 355,03 ms | 112,0 prod/s | 0,78x | -27,61% (0,00%) |
| **500 prod.** | Paralelo `process` (`w=2`) | **2.353,21 ms** | 2.378,45 ± 131,70 ms | **212,5 prod/s** | **1,49x** | **+32,74% (redução: 32,74%)** |
| **500 prod.** | Paralelo `process` (`w=4`) | **1.067,06 ms** | 1.089,64 ± 138,23 ms | **468,6 prod/s** | **3,28x** | **+69,50% (redução: 69,50%)** |
| **1.000 prod.** | Sequencial (`w=1`) | 6.292,55 ms | 6.284,68 ± 138,65 ms | 158,9 prod/s | 1,00x | base |
| **1.000 prod.** | Paralelo `thread` (`w=4`, GIL) | 8.792,48 ms | 8.737,13 ± 271,30 ms | 113,7 prod/s | 0,72x | -39,73% (0,00%) |
| **1.000 prod.** | Paralelo `process` (`w=2`) | **4.830,20 ms** | 4.841,94 ± 174,71 ms | **207,0 prod/s** | **1,30x** | **+23,24% (redução: 23,24%)** |
| **1.000 prod.** | Paralelo `process` (`w=4`) | **2.259,25 ms** | 2.277,57 ± 108,04 ms | **442,6 prod/s** | **2,79x** | **+64,10% (redução: 64,10%)** |

> **Ganho real comprovado:** com `ProcessPoolExecutor` (`w=4`), o throughput subiu de **151,6 → 549,3 prod/s (3,62x)** para 200 produtos, **142,9 → 468,6 prod/s (3,28x)** para 500 produtos e **158,9 → 442,6 prod/s (2,79x)** para 1.000 produtos, com redução de latência entre **64,10% e 72,41%** e resultados 100% idênticos à versão sequencial.

## 4. Cenário 1 (Comparativo de controle): Ranqueamento unitário (`ThreadPoolExecutor`, `min_items_for_parallel=1`)

| Candidatos | Modo / Executor | Latência Mediana | Latência Média ± Desvio Padrão | Throughput | Speedup | Variação |
|---:|---|---:|---:|---:|---:|---:|
| **100** | Sequencial (`w=1`) | 0,402 ms | 0,470 ± 0,161 ms | 248.818 cand/s | 1,00x | base |
| **100** | Paralelo `thread` (`w=2`) | 0,535 ms | 0,584 ± 0,146 ms | 187.021 cand/s | 0,75x | -33,04% |
| **100** | Paralelo `thread` (`w=4`) | 0,542 ms | 0,560 ± 0,085 ms | 184.434 cand/s | 0,74x | -34,91% |
| **1.000** | Sequencial (`w=1`) | 4,826 ms | 4,694 ± 0,644 ms | 207.198 cand/s | 1,00x | base |
| **1.000** | Paralelo `thread` (`w=2`) | 5,507 ms | 5,489 ± 0,772 ms | 181.597 cand/s | 0,88x | -14,10% |
| **1.000** | Paralelo `thread` (`w=4`) | 4,339 ms | 4,386 ± 0,530 ms | 230.463 cand/s | 1,11x | +10,09% |
| **5.000** | Sequencial (`w=1`) | 25,007 ms | 25,127 ± 0,485 ms | 199.942 cand/s | 1,00x | base |
| **5.000** | Paralelo `thread` (`w=2`) | 20,331 ms | 21,941 ± 4,218 ms | 245.935 cand/s | 1,23x | +18,70% |
| **5.000** | Paralelo `thread` (`w=4`) | 21,503 ms | 21,950 ± 1,777 ms | 232.527 cand/s | 1,16x | +14,01% |

## 5. Validação automatizada e integração no produto
- **Integração no fluxo real:** `select_candidates` em `modulo-ia/app/fallback.py` utiliza `rank_candidates_parallel`, e `POST /recommendations/batch` em `modulo-ia/app/service.py` utiliza `select_candidates_batch` (`rank_batch_recommendations_parallel`), com limiares e executor configuráveis em `modulo-ia/app/config.py`.
- **Equivalência e testes:** suíte completa `pytest` em `modulo-ia/tests/` executada via `docker build --target test --progress=plain ./modulo-ia` — **33/33 testes aprovados em 5,00 s** (equivalência exata entre sequencial, `thread` e `process`, endpoints HTTP `/recommendations` e `/recommendations/batch`, serviço e desempenho P95).
