# Metodologia de Benchmark — Projeto Origem

## 1. Objetivo
Definir um procedimento documentado e reproduzível de avaliação de desempenho para o **Projeto Origem**, consolidando as suítes já existentes no repositório (estruturas de dados em C++17 e TypeScript, serviço de IA/recomendações em Python e testes E2E de interface com Cypress) e estabelecendo critérios rigorosos de comparação e reprodutibilidade — inclusive como base metodológica para a **Parte 2 (FCCPD — Unidade 2)** (paralelismo e comunicação entre módulos).

> Nota de transparência: este documento formaliza a metodologia e os procedimentos de execução; os resultados empíricos do benchmark de paralelismo do `modulo-ia` estão registrados em `docs/medicao-ganho-paralelismo.md`, `docs/medicao-interpretacao-paralelismo.md` e `docs/benchmark_amostras_brutas.csv`.

## 2. O Que Será Medido (Métricas)
- **Implementado nas suítes do repositório**:
  - **Estruturas de dados (`aed/src/benchmark.cpp` e `backend/app/src/aed/benchmarks/analise-complexidade.ts`)**: tempo de execução/duração de inserção, busca (linear, binária, tabela hash, árvore binária de busca), enfileiramento/desenfileiramento e empilhamento/desempilhamento por volume.
  - **Serviço de IA — desempenho geral (`modulo-ia/tests/test_performance.py`)**: tempo de execução das recomendações (`time.perf_counter()`), cálculo do **percentil P95** (com critério de referência `<= 2s` no teste) e confirmação do volume processado (`10.000` candidatos).
  - **Serviço de IA — paralelismo sequencial vs. paralelo (`modulo-ia/benchmark_parallel.py`)**: o script coleta **latência** com `time.perf_counter()` e calcula mediana, média e mínimo; o desvio padrão é calculado externamente a partir das amostras brutas de cada configuração em `docs/benchmark_amostras_brutas.csv`. O *throughput* (`produtos/s` no pré-cálculo em lote e `candidatos/s` no ranqueamento unitário) é derivado externamente a partir do volume e da mediana, enquanto o script calcula variação/redução percentual e ganho relativo de paralelismo:

$$\text{Speedup} = \frac{T_{\text{seq}}}{T_{\text{par}}}$$

  - **Interface E2E (`e2e/cypress/e2e/desempenho.cy.js` — TC09)**: tempo até renderização/hidratação com conteúdo esperado em **renderização do catálogo**, **renderização da busca** e **renderização dos detalhes do produto**, acompanhando **média** (`<= 2.000 ms`) e **maior tempo** (sem execução `> 4.000 ms`).

## 3. Ferramentas e Scripts Utilizados
- **C++17**: `aed/src/benchmark.cpp` (`std::chrono` e `std::shuffle` com semente fixa `12345`), compilado/executado via `aed/Makefile` (`make benchmark`).
- **TypeScript / Node.js**: `backend/app/src/aed/benchmarks/analise-complexidade.ts` (`perf_hooks`), executado via script `aed:benchmark` em `backend/app`.
- **IA / Recomendação — desempenho P95 (Python)**: `modulo-ia/tests/test_performance.py` (`time.perf_counter()`), executado com `pytest`.
- **IA / Recomendação — benchmark sequencial vs. paralelo (Python)**: `modulo-ia/benchmark_parallel.py` (`time.perf_counter()`, `ThreadPoolExecutor` e `ProcessPoolExecutor` com `initializer`), executado via `python -m benchmark_parallel`, exportando amostras brutas para `docs/benchmark_amostras_brutas.csv`.
- **End-to-End / UI**: `e2e/cypress/e2e/desempenho.cy.js` (TC09), executado via Cypress em `e2e`.

## 4. Configurações da Máquina e do Ambiente
### 4.1. Máquina de execução do benchmark de paralelismo (CSV atual — `2026-11-24`)
- **Sistema operacional**: Microsoft Windows 11 — Versão `10.0.26300-SP0` (PowerShell)
- **Processador (CPU)**: `11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz` (`2419 MHz`, 4 núcleos físicos / 8 CPUs lógicas)
- **Memória RAM**: `15,80 GB`
- **Runtime Python**: `3.14.7` (validação da suíte `pytest` também executada em container Docker `python:3.13-slim`)
- **Estado de carga da máquina**: execução local dedicada sem outros benchmarks concorrentes; ambiente reproduzível via `python -m benchmark_parallel`.

### 4.2. Máquina de referência adicional (validação de metodologia inicial)
- **Sistema operacional**: Microsoft Windows 11 Home — Versão `10.0.26200` (Build `26200`)
- **Processador (CPU)**: `AMD Ryzen 7 8840HS w/ Radeon 780M Graphics` (8 núcleos físicos / 16 threads lógicas, clock máx. `3301 MHz`)
- **Memória RAM**: `13,79 GB`
- **Runtimes**: Node.js `v24.18.0` | npm `11.16.0` | Python `3.13.14`

## 5. Volume de Dados e Carga de Teste
- **Benchmark de paralelismo da IA (`modulo-ia/benchmark_parallel.py`)**:
  - **Cenário 1 (ranqueamento unitário)**: `100`, `1.000` e `5.000` candidatos determinísticos.
  - **Cenário 2 (pré-cálculo de recomendações em lote)**: lotes de `200`, `500` e `1.000` produtos de referência avaliados contra um catálogo determinístico de `1.000` peças (top-5 por produto), comparando sequencial, `ThreadPoolExecutor` (`w=4`) e `ProcessPoolExecutor` (`w=2` e `w=4`).
- **Benchmark C++ (`aed/src/benchmark.cpp`)**: volumes sintéticos `N1 = 100`, `N2 = 1.000`, `N3 = 10.000`, `N4 = 50.000` e `N5 = 100.000` registros, utilizando semente fixa (`12345`) no embaralhamento da árvore via `std::shuffle` e amostras determinísticas e distribuídas ao longo do conjunto de dados (mesmos elementos nas estruturas comparadas).
- **Benchmark TypeScript (`backend/app/src/aed/benchmarks/analise-complexidade.ts`)**: volumes de `100`, `1.000`, `10.000` e `50.000` registros, com índices de busca calculados deterministicamente e distribuídos ao longo do conjunto de dados. Possui pendência conhecida de embaralhamento para a árvore binária (ver Seção 7).
- **Benchmark de IA (`modulo-ia/tests/test_performance.py`)**: lote sintético de `10.000` candidatos por execução.
- **Teste de desempenho E2E (`e2e/cypress/e2e/desempenho.cy.js`)**: fluxos de catálogo, busca e detalhes de produto, utilizando o produto criado pela preparação do cenário de teste (`cy.criarProdutoAprovado()`). O teste atual não estabelece uma massa de `10.000` produtos.

## 6. Número de Repetições e Aquecimento (Warm-up)
- **Estado atual nas suítes**:
  - `modulo-ia/benchmark_parallel.py`: **2 execuções de aquecimento** (*warm-up*) descartadas + **7 repetições cronometradas** por configuração (`147` amostras brutas no CSV). O script calcula internamente mediana, média e mínimo, e grava no CSV as amostras, a mediana e a média. O desvio padrão apresentado nos relatórios é calculado externamente a partir das sete amostras brutas de cada configuração. O script também calcula speedup e variação/redução percentual; o throughput dos relatórios é derivado externamente da mediana.
  - `e2e/cypress/e2e/desempenho.cy.js` (TC09): **10 medições** por operação (calcula média e máximo).
  - `modulo-ia/tests/test_performance.py`: **20 execuções** de recomendação (calcula P95).
  - `aed/src/benchmark.cpp` e `backend/app/src/aed/benchmarks/analise-complexidade.ts`: não possuem laço multi-repetição nem estatística consolidada entre rodadas no código atual.
- **Parâmetro definido para os benchmarks de estruturas de dados (C++ e TypeScript)**:
  - **3 execuções de aquecimento (*warm-up*)** descartadas antes da coleta.
  - **10 execuções efetivamente medidas** por volume.
  - Registro consolidado de **média**, **mediana** e **desvio padrão** nos relatórios de execução (e **P95** quando aplicável).

## 7. Condições Equivalentes para Testes Comparativos
- Utilizar a mesma massa de dados e/ou semente determinística entre cenários comparados, com amostras determinísticas e distribuídas ao longo do conjunto de dados.
- **Embaralhamento e equivalência na árvore binária**: o benchmark C++ já utiliza `std::shuffle` com semente fixa (`12345`). No benchmark TypeScript (`analise-complexidade.ts`), há problema pendente no comparador do `.sort()` (`() => ((produtos.length * 31) % 2 === 0 ? 1 : -1)`), que não embaralha adequadamente; a correção definida é substituir por embaralhamento válido (Fisher-Yates) com semente fixa.
- **Separação entre preparação e medição**: setup de dados e construção de índices devem ficar fora do trecho cronometrado. Nos benchmarks atuais de busca linear (C++ e TypeScript), a conversão de lista encadeada para vetor/array ocorre dentro do tempo medido — o procedimento recomenda ajustar os scripts para isolar exclusivamente a operação de busca.
- Impedir eliminação de código morto (*dead code elimination*), manter condições controladas de execução (mesma máquina/ambiente, sem cargas paralelas fora do escopo) e interpretar resultados relacionando ganhos e gargalos às escolhas de arquitetura e paralelismo.

## 8. Comandos para Reproduzir o Benchmark

### Benchmark C++ (AED)
    cd aed && make benchmark

### Benchmark TypeScript (AED)
    npm --prefix backend/app run aed:benchmark

### Benchmark de paralelismo da IA (gera `docs/benchmark_amostras_brutas.csv`)
    cd modulo-ia
    python -m benchmark_parallel

### Benchmark de desempenho da IA (no ambiente Python ou Docker do `modulo-ia`)
    docker build --target test --progress=plain ./modulo-ia
    # ou localmente com pytest instalado:
    cd modulo-ia && pytest tests/test_performance.py -v

### Benchmark E2E de interface (Cypress)
    npm --prefix e2e test -- --spec cypress/e2e/desempenho.cy.js