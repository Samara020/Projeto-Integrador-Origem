# Medição do Ganho Obtido com o Paralelismo — Ranqueamento de Candidatos (`modulo-ia`)

## 1. Ambiente, data e metodologia
- **Data de referência:** 24 de novembro de 2026 (`2026-11-24`).
- **Ambiente:** Windows PowerShell 5.1 / Python 3.13 (reprodutível via `python -m benchmark_parallel` dentro de `modulo-ia/`).
- **Tarefa:** `rank_candidates` (sequencial) vs. `rank_candidates_parallel` (`executor_type="thread"`) em `modulo-ia/app/recommendation.py`.
- **Volumes de teste:** `100`, `1.000` e `5.000` produtos candidatos com contexto `{"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}`.
- **Aquecimento e repetições:** `2` execuções preliminares de aquecimento (*warm-up*) descartadas + `7` repetições cronometradas com `time.perf_counter()` (`126` registros em `docs/benchmark_amostras_brutas.csv`).

## 2. Fórmulas aplicadas sobre a mediana
- `Speedup = T_sequencial / T_paralelo`
- `Variação (%) = ((T_sequencial - T_paralelo) / T_sequencial) * 100`
- `Redução de tempo (%) = max(0, Variação (%))`

## 3. Tabela comparativa — Modo forçado (`min_items_for_parallel=1`, valores do CSV)

| Candidatos | Sequencial Mediana | Paralelo `thread` (`w=2`) Mediana | Speedup (`w=2`) | Variação / Redução (`w=2`) | Paralelo `thread` (`w=4`) Mediana | Speedup (`w=4`) | Variação / Redução (`w=4`) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **100** | 0,360 ms | 0,740 ms | 0,49x | -105,56% (redução: 0,00%) | 0,970 ms | 0,37x | -169,44% (redução: 0,00%) |
| **1.000** | 3,640 ms | 4,700 ms | 0,77x | -29,12% (redução: 0,00%) | 5,130 ms | 0,71x | -40,93% (redução: 0,00%) |
| **5.000** | 18,710 ms | 20,800 ms | 0,90x | -11,17% (redução: 0,00%) | 21,360 ms | 0,88x | -14,16% (redução: 0,00%) |

## 4. Tabela comparativa — Modo padrão (`min_items_for_parallel=32`, valores do CSV)

| Candidatos | Sequencial Mediana | Paralelo `thread` (`w=2`) Mediana | Speedup (`w=2`) | Variação / Redução (`w=2`) | Paralelo `thread` (`w=4`) Mediana | Speedup (`w=4`) | Variação / Redução (`w=4`) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **100** | 0,360 ms | 0,604 ms | 0,60x | -67,76% (redução: 0,00%) | 0,815 ms | 0,44x | -126,35% (redução: 0,00%) |
| **1.000** | 3,640 ms | 4,617 ms | 0,79x | -26,85% (redução: 0,00%) | 5,506 ms | 0,66x | -51,26% (redução: 0,00%) |
| **5.000** | 18,710 ms | 20,386 ms | 0,92x | -8,96% (redução: 0,00%) | 20,660 ms | 0,91x | -10,42% (redução: 0,00%) |

## 5. Validação automatizada
- Comando executado em `modulo-ia/`: `python -m pytest --noconftest tests/test_parallel_equivalence.py` (sem carregar `conftest.py` / inicialização automática do BentoML).
- Resultado: `2 passed` (equivalência entre `rank_candidates` e `rank_candidates_parallel` e tratamento de lista vazia).