# Relatorio: Interpretacao dos Resultados e Justificativa das Decisoes Tecnicas

## 1. Onde Houve Ganho e Onde Nao Houve Ganho

- **Testes cronometrados de paralelismo (100, 1.000 e 5.000 candidatos):** nao houve ganho de tempo em relacao a execucao sequencial (0,00% de reducao de tempo tanto em min_items_for_parallel=1 quanto em min_items_for_parallel=32, com w=2 e w=4).
- **Validacao funcional:** python -m pytest --noconftest tests/test_parallel_equivalence.py aprovou 2/2 testes, garantindo equivalencia de resultados entre execucao sequencial e paralela e tratamento de lista vazia.
- **Onde faz sentido paralelismo/assincronismo:** em operacoes com espera de E/S, processamento assincrono fora da resposta sincrona ou cargas maiores em que o custo de coordenacao e amortizado.

## 2. Analise com Base nas Medicoes (docs/medicao-ganho-paralelismo.md e docs/benchmark_amostras_brutas.csv)

- **Ambiente e protocolo:** Windows / Python 3.13, 2 aquecimentos + 7 repeticoes por cenario (126 amostras brutas), avaliando 100, 1.000 e 5.000 candidatos.
- **Modo forcado (min_items_for_parallel=1):**
  - 100 candidatos: sequencial 0,360 ms | w=2 0,740 ms (0,49x, -105,56%) | w=4 0,970 ms (0,37x, -169,44%).
  - 1.000 candidatos: sequencial 3,640 ms | w=2 4,700 ms (0,77x, -29,12%) | w=4 5,130 ms (0,71x, -40,93%).
  - 5.000 candidatos: sequencial 18,710 ms | w=2 20,800 ms (0,90x, -11,17%) | w=4 21,360 ms (0,88x, -14,16%).
- **Modo padrao (min_items_for_parallel=32):**
  - 100 candidatos: sequencial 0,360 ms | w=2 0,604 ms (0,60x, -67,76%) | w=4 0,815 ms (0,44x, -126,35%).
  - 1.000 candidatos: sequencial 3,640 ms | w=2 4,617 ms (0,79x, -26,85%) | w=4 5,506 ms (0,66x, -51,26%).
  - 5.000 candidatos: sequencial 18,710 ms | w=2 20,386 ms (0,92x, -8,96%) | w=4 20,660 ms (0,91x, -10,42%).

## 3. Custo Adicional da Comunicacao entre Componentes

- A integracao Frontend (:3000) -> Backend (:4000) -> Modulo de IA (:3001) via POST /recommendations (X-API-Key) adiciona serializacao JSON, sobrecarga HTTP e latencia de rede alem do tempo de calculo interno.
- O Backend aplica timeout (2000 ms) e fallback baseline local para que indisponibilidade ou lentidao da IA nao bloqueiem a resposta ao usuario.

## 4. Limitacoes de CPU, Memoria, E/S e Sincronizacao

- **CPU e GIL:** o ranqueamento em Python (calculate_score e build_reason) e leve por item e sujeito ao GIL em ThreadPoolExecutor, impedindo ganho linear com multiplas threads; w=4 tende a aumentar o custo de coordenacao em relacao a w=2 em cargas menores.
- **Memoria e sincronizacao:** no modulo-ia, particionamento e consolidacao alocam estruturas temporarias sem necessidade de locks no calculo read-only; em Origem.Concorrencia (.NET 10, :5000), Channel (100 mensagens), BackgroundService (ProcessadorPedidos.cs) e estado demonstrativo ficam em memoria (sem persistencia no PostgreSQL), exigindo controle de concorrencia e retorno 503 quando a fila enche.
- **E/S e rede:** consultas ao PostgreSQL (:5433) via Prisma e chamadas HTTP entre servicos introduzem latencia de E/S/rede superior ao tempo puro de avaliacao em memoria.

## 5. Casos Sem Ganho e Causas Provaveis

- Em todos os volumes medidos (100, 1.000 e 5.000 itens), o tempo paralelo excedeu o sequencial devido ao overhead de agendamento/coleta de futures, ordenacao/consolidacao e limitacao do GIL frente ao baixo custo por candidato.

## 6. Relacao com as Decisoes de Arquitetura e Conclusoes

- Manter min_items_for_parallel = 32 evita paralelismo desnecessario em listas curtas, reservando ProcessPoolExecutor para cenarios em que a carga justifique processos/serializacao.
- Preservar o Backend como monolito modular (Node.js + Express + Prisma + PostgreSQL) protege a consistencia transacional sem Sagas distribuidas.
- Manter modulo-ia (:3001, com fallback baseline) e Origem.Concorrencia (.NET 10, :5000, em memoria) isolados evita contendas e preserva a resiliencia do fluxo principal.
