# Relatório: Interpretação dos Resultados e Justificativa das Decisões Técnicas

## 1. Onde Houve Ganho e Onde Não Houve Ganho

- **Onde houve ganho expressivo (`ProcessPoolExecutor` no pré-cálculo de recomendações em lote — `POST /recommendations/batch`):** com o catálogo de `1.000` peças carregado uma única vez por processo via `initializer`, o uso de 4 workers reduziu a latência em **64,10% a 72,41%** (*speedup* de **`2,79x` a `3,62x`**) e elevou o *throughput* de `142,9`–`158,9 prod/s` para **`442,6`–`549,3 prod/s`**.
- **Onde não houve ganho (`ThreadPoolExecutor` em Python e listas pequenas):**
  - No mesmo lote, `ThreadPoolExecutor` (`w=4`) teve *speedup* de **`0,72x` a `0,78x`** (piora de `-27,61%` a `-39,73%`) devido à disputa pelo GIL do Python em código CPU-bound.
  - No ranqueamento unitário de listas pequenas (`100` candidatos, mediana sequencial de `0,402 ms`), paralelizar adicionou *overhead* (`0,74x`–`0,75x`).
- **Validação funcional automatizada:** a suíte `pytest` completa do `modulo-ia` (`docker build --target test --progress=plain ./modulo-ia`) aprovou **33/33 testes** (incluindo equivalência exata entre sequencial, `thread` e `process` em `tests/test_parallel_equivalence.py`, endpoints HTTP `/recommendations` e `/recommendations/batch` em `tests/test_api.py` e P95 em `tests/test_performance.py`).

## 2. Análise com Base nas Medições (`docs/medicao-ganho-paralelismo.md`, `docs/benchmark_amostras_brutas.csv` e `docs/benchmark_comunicacao_brutas.csv`)

- **Rastreabilidade e ambiente:** branch `feat/unidade2-paralelismo-benchmarks`, commit SHA `93628a1fa677193f818708aa753ecc4cda125542` (`93628a1`); Windows 11 (`10.0.26300-SP0`), `Intel Core i5-1135G7 @ 2.40GHz` (4 núcleos físicos / 8 CPUs lógicas), `15,80 GB` RAM, Python `3.14.7`, Node.js `v24.19.0`, Docker Compose (`postgres`, `backend`, `modulo-ia`).
- **Protocolo de paralelismo:** `2` aquecimentos + `7` repetições por cenário (**`147` amostras brutas** em `docs/benchmark_amostras_brutas.csv`).
- **Protocolo de comunicação distribuída:** `5` aquecimentos + `30` repetições por cenário (**`90` amostras brutas** em `docs/benchmark_comunicacao_brutas.csv`, via `scripts/benchmark-comunicacao.mjs`).
- **Cenário 2 — Pré-cálculo de recomendações em lote (catálogo de `1.000` peças, top-5 por produto):**
  - **200 produtos:** sequencial `1.319,69 ms` (`151,6 prod/s`) | `thread w=4` `1.725,39 ms` (`0,76x`, `-30,74%`) | `process w=2` **`575,15 ms`** (**`2,29x`**, `-56,42%`) | `process w=4` **`364,08 ms`** (**`3,62x`**, `-72,41%`, `549,3 prod/s`).
  - **500 produtos:** sequencial `3.498,87 ms` (`142,9 prod/s`) | `thread w=4` `4.464,93 ms` (`0,78x`, `-27,61%`) | `process w=2` **`2.353,21 ms`** (**`1,49x`**, `-32,74%`) | `process w=4` **`1.067,06 ms`** (**`3,28x`**, `-69,50%`, `468,6 prod/s`).
  - **1.000 produtos:** sequencial `6.292,55 ms` (`158,9 prod/s`) | `thread w=4` `8.792,48 ms` (`0,72x`, `-39,73%`) | `process w=2` **`4.830,20 ms`** (**`1,30x`**, `-23,24%`) | `process w=4` **`2.259,25 ms`** (**`2,79x`**, `-64,10%`, `442,6 prod/s`).
- **Cenário 1 — Ranqueamento unitário (`ThreadPoolExecutor`, `min_items_for_parallel=1`):**
  - `100` candidatos: sequencial `0,402 ms` | `w=2` `0,535 ms` (`0,75x`) | `w=4` `0,542 ms` (`0,74x`).
  - `1.000` candidatos: sequencial `4,826 ms` | `w=2` `5,507 ms` (`0,88x`) | `w=4` `4,339 ms` (`1,11x`).
  - `5.000` candidatos: sequencial `25,007 ms` | `w=2` `20,331 ms` (`1,23x`) | `w=4` `21,503 ms` (`1,16x`).

## 3. Custo Adicional da Comunicação entre Componentes

Para ir além de chamadas isoladas e quantificar sistematicamente o custo e a dispersão da comunicação distribuída, executamos `scripts/benchmark-comunicacao.mjs` (`5` aquecimentos + `30` repetições por cenário = **`90` amostras** registradas em `docs/benchmark_comunicacao_brutas.csv`, SHA `93628a1`) contra a pilha Docker real (`backend` `:4000` + `modulo-ia` `:3001` + `postgres` `:5433`):

| Cenário | HTTP 200 | Fonte | Mediana | Média ± DP | P95 | Mín – Máx | Throughput |
|---|---:|---|---:|---:|---:|---:|---:|
| `ia_direto` (`POST :3001/recommendations`) | 30/30 | `ia_direto` | **10,943 ms** | 11,978 ± 4,700 ms | 20,655 ms | 5,871 – 22,836 ms | 91,4 req/s |
| `backend_com_ia` (`GET :4000/produtos/recomendacoes`) | 30/30 | `ia` | **17,694 ms** | 19,426 ± 4,728 ms | 28,195 ms | 13,658 – 34,151 ms | 56,5 req/s |
| `backend_fallback_baseline` (`modulo-ia` parado) | 30/30 | `baseline` | **2.013,959 ms** | 2.014,869 ± 4,870 ms | 2.026,490 ms | 2.008,477 – 2.027,469 ms | 0,5 req/s |

- **Decomposição do custo de rede/E/S vs. cálculo puro:** nos logs do `modulo-ia-1`, o cálculo interno de recomendação em Python consome apenas **`0,19`–`0,56 ms`** (`elapsed_ms`). A chamada HTTP direta do host ao container (`ia_direto`) eleva a mediana para **`10,943 ms`** (serialização JSON, validação HTTP/BentoML e ponte de rede Docker). Quando a requisição percorre o fluxo completo do produto (`backend_com_ia`: Express + consulta Prisma ao PostgreSQL + chamada HTTP `POST /recommendations` com `X-API-Key`), a mediana sobe para **`17,694 ms`** (`+6,751 ms` ou `+61,7%` sobre `ia_direto`; P95 de `28,195 ms`). Ou seja, **mais de 95% da latência unitária distribuída é custo de comunicação e E/S**, não de computação — mas o valor absoluto (`P95 = 28,2 ms`) permanece ~**70× abaixo** do limite de `2.000 ms` do critério de desempenho da interface (TC09), validando a separação dos serviços em operação normal.
- **Variação observada (desvio padrão ~`4,7 ms`):** o desvio padrão equivalente nos dois cenários ativos (`±4,700 ms` e `±4,728 ms`, com picos até `34,151 ms`) reflete o *jitter* natural da rede virtual Docker Desktop no Windows e do agendamento de processos, confirmando por que a **mediana** e o **P95** são mais confiáveis que uma medição isolada.
- **Trade-off medido no fallback sem *circuit breaker* (`2.013,959 ms`):** com o `modulo-ia` parado, **30/30 requisições** retornaram `HTTP 200` com `X-Recomendacao-Fonte: baseline`, comprovando tolerância a falhas sem quebra para o usuário. Contudo, como o backend tenta contactar o `modulo-ia` a cada chamada e aguarda integralmente `RECOMENDACAO_TIMEOUT_MS=2000 ms` antes de cair para o *baseline* local (~`14 ms` de SQL/cálculo), o *throughput* cai de **`56,5 req/s` para `0,5 req/s`**. Esse achado empírico justifica a recomendação de evoluir o cliente `backend/app/src/lib/modulo-ia.ts` com um ***circuit breaker*** (abrir o circuito após falhas/timeouts consecutivos por uma janela de *cooldown*, reduzindo o tempo em falha de ~`2.014 ms` para `<20 ms`).

## 4. Limitações de CPU, Memória, E/S e Sincronização

- **CPU e GIL:** o ranqueamento em Python (`calculate_score` e `build_reason`) é CPU-bound e sofre serialização pelo GIL em `ThreadPoolExecutor`; migrar a carga em lote para `ProcessPoolExecutor` liberou execução paralela real nos múltiplos núcleos físicos.
- **Memória e sincronização:** no `modulo-ia`, particionamento e consolidação operam em modo somente-leitura sem necessidade de *locks*, e o uso de `initializer` carrega o catálogo uma única vez por processo worker evitando cópias repetidas por IPC. Em `Origem.Concorrencia` (.NET 10, `:5000`), `Channel` (100 mensagens), `BackgroundService` (`ProcessadorPedidos.cs`) e estado demonstrativo ficam em memória (sem persistência no PostgreSQL), exigindo controle de concorrência (`lock`) e retorno `503` quando a fila enche.
- **E/S e rede:** consultas ao PostgreSQL (`:5433`) via Prisma e chamadas HTTP entre serviços introduzem latência de E/S/rede que deve ser amortizada evitando chamadas desnecessárias e mantendo fallback local.

## 5. Casos Sem Ganho e Causas Prováveis

- **Threads sob carga CPU-bound (`0,72x`–`0,78x`):** contenção pelo GIL do CPython + troca de contexto entre threads sem paralelismo real de CPU.
- **Listas pequenas (`100` candidatos, `0,74x`–`0,75x`):** tempo base submilissegundo (`0,402 ms`), onde o custo de particionar, agendar *futures* e consolidar supera o tempo economizado.

## 6. Relação com as Decisões de Arquitetura e Conclusões

- Adotar **`ProcessPoolExecutor` com limiares configuráveis** (`RECOMENDACAO_PARALLEL_MIN_ITEMS=2000` e `RECOMENDACAO_PARALLEL_BATCH_MIN_REQUESTS=16` em `modulo-ia/app/config.py`) garante latência submilissegundo em listas pequenas e ganho real de **`2,79x` a `3,62x`** em cargas de lote.
- Preservar o Backend como **monólito modular** (`Node.js + Express + Prisma + PostgreSQL`) protege a consistência transacional (`FOR UPDATE`, idempotência `RN38`) sem a complexidade de Sagas distribuídas (`ADR-005`).
- Manter o **`modulo-ia` (`:3001`, com fallback baseline)** separado do Backend Node.js evita que processamento CPU-bound bloqueie o *event loop* das compras, e manter **`Origem.Concorrencia` (.NET 10, `:5000`, em memória)** isolado preserva a integridade do banco transacional (`ADR-003`).
