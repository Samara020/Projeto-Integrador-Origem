# Interpretação dos Resultados e Justificativa das Decisões Técnicas — `modulo-ia`

## 1. Síntese dos resultados obtidos
Com base nas `147` medições registradas em `docs/benchmark_amostras_brutas.csv` e consolidadas em `docs/medicao-ganho-paralelismo.md` (`2` aquecimentos + `7` repetições por cenário):

- **Pré-cálculo de recomendações em lote (`ProcessPoolExecutor`, catálogo de `1.000` peças):**
  - `200` produtos: **1.319,69 ms → 364,08 ms** (*speedup* **`3,62x`**, redução de **`72,41%`** com `w=4`; **`2,29x`** / **`56,42%`** com `w=2`).
  - `500` produtos: **3.498,87 ms → 1.067,06 ms** (*speedup* **`3,28x`**, redução de **`69,50%`** com `w=4`; **`1,49x`** / **`32,74%`** com `w=2`).
  - `1.000` produtos: **6.292,55 ms → 2.259,25 ms** (*speedup* **`2,79x`**, redução de **`64,10%`** com `w=4`; **`1,30x`** / **`23,24%`** com `w=2`).
- **Comparação direta `ThreadPoolExecutor` vs. `ProcessPoolExecutor` na mesma carga:**
  - Usando `ThreadPoolExecutor` (`w=4`) no mesmo lote, o tempo **piorou** em todos os tamanhos (`0,72x` a `0,78x`, de `-27,61%` a `-39,73%`), comprovando na prática o gargalo do **GIL** em Python para trabalho CPU-bound.
- **Ranqueamento unitário em listas pequenas (`100` candidatos):**
  - O tempo sequencial já é submilissegundo (`0,402 ms`); paralelizar listas pequenas introduz *overhead* (`0,74x`–`0,75x`), o que justifica manter limiares mínimos configuráveis (`PARALLEL_MIN_ITEMS` e `PARALLEL_BATCH_MIN_REQUESTS`).

## 2. Justificativa das decisões técnicas

1. **Multiprocessamento (`ProcessPoolExecutor`) para escapar do GIL em trabalho CPU-bound:**
   - O cálculo de afinidade (`calculate_score`, `build_reason` e ordenação) é processamento puro em CPU no interpretador Python. Trocar *threads* por múltiplos processos independentes libera o uso simultâneo de múltiplos núcleos físicos, gerando ganhos entre **`2,79x` e `3,62x`** com 4 workers.
2. **Compartilhamento único do catálogo via `initializer` e pool reutilizado:**
   - Carregar o catálogo uma única vez na inicialização de cada worker (`_init_batch_worker`) evita serializar (*pickle*) o catálogo inteiro a cada lote enviado por IPC. Trafegam entre processos apenas as fatias de produtos de referência e os resultados top-N, reduzindo drasticamente o custo de coordenação.
3. **Limiares configuráveis para proteger cargas pequenas (`app/config.py`):**
   - `select_candidates` (`app/fallback.py`) aciona `rank_candidates_parallel` apenas acima de `RECOMENDACAO_PARALLEL_MIN_ITEMS` (padrão `2000`), e `select_candidates_batch` aciona paralelismo acima de `RECOMENDACAO_PARALLEL_BATCH_MIN_REQUESTS` (padrão `16`). Assim, requisições pequenas do catálogo atual mantêm latência submilissegundo sem *overhead* desnecessário, enquanto cargas maiores e pré-cálculo em lote escalam em múltiplos núcleos.
4. **Integração real no serviço e determinismo garantido:**
   - Tanto `POST /recommendations` quanto `POST /recommendations/batch` (`app/service.py`) utilizam as rotinas paralelas de `app/fallback.py` / `app/recommendation.py`. A suíte `tests/test_parallel_equivalence.py` comprova que a saída paralela (`thread` e `process`) é bit a bit idêntica à sequencial (incluindo critério de desempate determinístico por `(-score, product_id)`).
5. **Separação entre paralelismo de dados e concorrência de estado:**
   - O paralelismo no `modulo-ia` opera em partições independentes somente-leitura (sem *locks* nem condição de corrida), enquanto a concorrência com escrita transacional no marketplace é tratada via `FOR UPDATE` no PostgreSQL (`backend/app`) e demonstrada com fila assíncrona (`Channel` + `BackgroundService`) em `backend/backend/Origem.Concorrencia/`.
