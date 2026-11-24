# Medição de Desempenho e Interpretação Técnica — Processamento Paralelo (`modulo-ia`)

## 1. Cenário e metodologia de medição
- **Tarefa avaliada:** ranqueamento de produtos candidatos (`rank_candidates` sequencial vs. `rank_candidates_parallel` paralelo) em `modulo-ia/app/recommendation.py`.
- **Script utilizado:** `modulo-ia/benchmark_parallel.py` (2 execuções de aquecimento + 7 repetições medidas via `time.perf_counter()`).
- **Cargas testadas:** `100`, `1.000` e `5.000` produtos candidatos, com `ThreadPoolExecutor` (`workers = 2` e `workers = 4`).

## 2. Resultados obtidos

| Candidatos | Sequencial (mediana) | Sequencial (média) | Paralelo `thread` (`w=2`, mediana) | Speedup (`w=2`) | Paralelo `thread` (`w=4`, mediana) | Speedup (`w=4`) |
|---:|---:|---:|---:|---:|---:|---:|
| **100** | 0,40 ms | 0,47 ms | 0,83 ms | 0,49x | 0,98 ms | 0,41x |
| **1.000** | 3,96 ms | 3,94 ms | 4,96 ms | 0,80x | 5,28 ms | 0,75x |
| **5.000** | 22,29 ms | 22,88 ms | 22,18 ms | 1,00x | 21,95 ms | 1,02x |

## 3. Interpretação dos resultados e justificativa das decisões técnicas

1. **Overhead supera o ganho em cargas pequenas e médias (`100` e `1.000` itens):**
   - O cálculo individual de compatibilidade (`calculate_score` e `build_reason`) é muito leve em memória. Para 100 e 1.000 candidatos, o custo de particionar a lista, agendar tarefas no `ThreadPoolExecutor` e consolidar os resultados supera o tempo economizado, resultando em *speedup* abaixo de `1,0x` (`0,41x` a `0,80x`).
2. **Ponto de equilíbrio em volumes maiores (`5.000` itens):**
   - A partir de 5.000 candidatos, o tempo paralelo empata ou supera marginalmente o sequencial (`1,00x` com 2 *workers* e `1,02x` com 4 *workers*). Isso justifica tecnicamente o parâmetro `min_items_for_parallel` na função `rank_candidates_parallel`, preservando a execução sequencial direta para o catálogo reduzido de demonstração do Origem.
3. **Efeito do GIL em Python com `ThreadPoolExecutor`:**
   - Como o ranqueamento é predominantemente CPU-bound (comparação normalizada de strings e soma ponderada), *threads* em Python disputam o GIL e não escalam linearmente em múltiplos núcleos.
4. **Separação entre paralelismo de dados e concorrência de estado:**
   - O ranqueamento em `modulo-ia` opera apenas em leitura sobre partições independentes, sem necessidade de bloqueios (`lock`), enquanto o controle de disputa de estoque e fila assíncrona permanece isolado em `backend/backend/Origem.Concorrencia/` (`lock` + `Channel` + `BackgroundService`).
