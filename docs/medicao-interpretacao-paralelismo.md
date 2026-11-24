# Interpretação dos Resultados e Justificativa das Decisões Técnicas — `modulo-ia`

## 1. Alinhamento com os resultados atuais do benchmark
Com base na medição reproduzida e registrada em `docs/benchmark_amostras_brutas.csv` e `docs/medicao-ganho-paralelismo.md` (`2` aquecimentos + `7` repetições por cenário, `100`, `1.000` e `5.000` candidatos):

- **Modo forçado (`min_items_for_parallel=1`):**
  - `100` candidatos: *speedup* de `0,49x` (`w=2`) e `0,37x` (`w=4`).
  - `1.000` candidatos: *speedup* de `0,77x` (`w=2`) e `0,71x` (`w=4`).
  - `5.000` candidatos: *speedup* de `0,90x` (`w=2`) e `0,88x` (`w=4`).
- **Modo padrão (`min_items_for_parallel=32`):**
  - Em todos os volumes testados (`100`, `1.000` e `5.000`), o tempo paralelo permaneceu acima do sequencial (variações negativas, sem ganho de tempo nessa carga e ambiente).

## 2. Justificativa das decisões técnicas

1. **Custo de coordenação e particionamento frente ao cálculo leve:**
   - As funções `calculate_score` e `build_reason` executam operações rápidas por candidato. O custo de fatiar a entrada, agendar *futures* no `ThreadPoolExecutor` e consolidar/ordenar os resultados supera o ganho nos volumes avaliados.
2. **Limiar `min_items_for_parallel`:**
   - Manter um limiar configurável (`min_items_for_parallel`, padrão `32`) evita disparar paralelismo desnecessário em listas pequenas onde o *overhead* é ainda mais pronunciado.
3. **Efeito do GIL em Python (`ThreadPoolExecutor`):**
   - Como o ranqueamento é predominantemente CPU-bound em memória no interpretador Python, *threads* disputam o GIL e não entregam paralelismo real de múltiplos núcleos; `ProcessPoolExecutor` permanece disponível como opção quando a carga computacional justificar o custo de processos/serialização.
4. **Separação entre paralelismo de dados e concorrência de estado:**
   - O ranqueamento em `modulo-ia` opera apenas em leitura sobre partições independentes, sem necessidade de *locks*, enquanto o controle de concorrência com estado compartilhado e fila assíncrona permanece isolado em `backend/backend/Origem.Concorrencia/` (`lock`, `Channel` e `BackgroundService`).