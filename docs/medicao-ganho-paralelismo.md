# Medi??o do Ganho Obtido com o Paralelismo ? Ranqueamento de Candidatos (`modulo-ia`)

## 1. Ambiente, data e metodologia
- **Timestamp UTC (CSV):** `2026-11-24T16:59:24.240663+00:00`
- **Ambiente:** `Windows 11 | Python 3.13.14` (reprodut?vel via `python -m benchmark_parallel` dentro de `modulo-ia/`).
- **Tarefa:** `rank_candidates` (sequencial) vs. `rank_candidates_parallel` (`executor_type="thread"`) em `modulo-ia/app/recommendation.py`.
- **Volumes de teste:** `100`, `1.000` e `5.000` produtos candidatos.
- **Aquecimento e repeti??es:** `2` warm-ups descartados + `7` repeti??es cronometradas com `time.perf_counter()` (`126` registros em `docs/benchmark_amostras_brutas.csv`).

## 2. F?rmulas aplicadas sobre a mediana
- `Speedup = T_sequencial / T_paralelo`
- `Varia??o (%) = ((T_sequencial - T_paralelo) / T_sequencial) * 100`
- `Redu??o de tempo (%) = max(0, Varia??o (%))`

## 3. Tabela comparativa ? Modo for?ado (`min_items_for_parallel=1`, valores do CSV)

| Candidatos | Sequencial Mediana | Paralelo `thread` (`w=2`) Mediana | Speedup (`w=2`) | Varia??o / Redu??o (`w=2`) | Paralelo `thread` (`w=4`) Mediana | Speedup (`w=4`) | Varia??o / Redu??o (`w=4`) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **100** | 0.362 ms | 0.828 ms | 0.44x | -128.71% (redu??o: 0.00%) | 1.043 ms | 0.35x | -188.26% (redu??o: 0.00%) |
| **1.000** | 3.712 ms | 4.902 ms | 0.76x | -32.08% (redu??o: 0.00%) | 5.304 ms | 0.70x | -42.88% (redu??o: 0.00%) |
| **5.000** | 18.748 ms | 20.364 ms | 0.92x | -8.62% (redu??o: 0.00%) | 21.269 ms | 0.88x | -13.45% (redu??o: 0.00%) |

## 4. Tabela comparativa ? Modo padr?o (`min_items_for_parallel=32`, valores do CSV)

| Candidatos | Sequencial Mediana | Paralelo `thread` (`w=2`) Mediana | Speedup (`w=2`) | Varia??o / Redu??o (`w=2`) | Paralelo `thread` (`w=4`) Mediana | Speedup (`w=4`) | Varia??o / Redu??o (`w=4`) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **100** | 0.361 ms | 1.097 ms | 0.33x | -204.22% (redu??o: 0.00%) | 1.058 ms | 0.34x | -193.26% (redu??o: 0.00%) |
| **1.000** | 3.776 ms | 5.062 ms | 0.75x | -34.04% (redu??o: 0.00%) | 5.482 ms | 0.69x | -45.18% (redu??o: 0.00%) |
| **5.000** | 18.951 ms | 20.975 ms | 0.90x | -10.68% (redu??o: 0.00%) | 21.553 ms | 0.88x | -13.73% (redu??o: 0.00%) |

## 5. Interpreta??o t?cnica e valida??o
- **Overhead vs. carga:** em lotes pequenos/m?dios, o custo de particionar e coordenar threads supera o c?lculo leve por item; o limiar `min_items_for_parallel=32` evita paralelizar listas curtas.
- **GIL em Python:** por ser tarefa CPU-bound em mem?ria, `ThreadPoolExecutor` n?o escala linearmente entre n?cleos.
- **Valida??o automatizada:** executado `python -m pytest --noconftest tests/test_parallel_equivalence.py` em `modulo-ia/` (`2 passed`).
