# Modelagem de Solução Comercial com Estruturas de Dados (AED em C++) — Sistema Origem

Este documento descreve a modelagem e implementação completa das estruturas de dados e algoritmos de busca desenvolvidos em **C++ moderno (C++17)** para a gestão de estoque, pedidos e catálogo do marketplace **Origem**, atendendo integralmente aos requisitos de **Algoritmos e Estruturas de Dados (AED — Unidade 2)**.

---

## 1. Visão Geral da Solução Comercial em C++

No ecossistema do marketplace Origem, o artesanato e os produtos regionais exigem regras de negócio específicas para o controle de estoque e ciclo de vida dos pedidos:

1. **Estoque de Produtos em Lista Encadeada:** Os lotes de peças e produtos disponíveis são armazenados em uma **Lista Duplamente Encadeada** (`aed::ListaEncadeada<T>`).
2. **Priorização da Saída de Estoque por Inserção Ordenada:** Produtos perecíveis ou com data de validade (ex.: doces e queijos artesanais) e peças com maior urgência de despacho são inseridos de forma **ordenada** com base na data de vencimento (FIFO por validade) ou nível de prioridade comercial via `inserirOrdenado(dado, comparador)`.
3. **Pedidos/Requisições em Fila:** Os pedidos de compra chegam concorrentemente e são organizados em uma **Fila FIFO** (`aed::Fila<T>`), garantindo atendimento sequencial e justo ("primeiro que chega é o primeiro atendido") com complexidade estrita $O(1)$.
4. **Histórico de Operações e Desfazer em Pilha:** Toda alteração de estoque (baixa de venda ou reposição) gera um evento registrado em uma **Pilha LIFO** (`aed::Pilha<T>`). Em caso de desistência de compra, cancelamento ou erro de digitação, o comando de **Desfazer (*Undo*)** reverte a última operação no topo da pilha, restaurando com exatidão o saldo anterior.
5. **Índice de Estoque por Tabela Hash:** Para consultas ultrarrápidas $O(1)$ por código de produto (ex.: `PRD-000201`), o estoque possui um índice baseado em **Tabela Hash** (`TabelaHash<K, V>`) com encadeamento separado (*separate chaining*) para tratamento de colisões e redimensionamento automático (*rehash*) quando o fator de carga ultrapassa $0.75$.
6. **Busca no Catálogo com Árvore Binária de Busca (BST) e Busca Binária:** O catálogo permite busca hierárquica ordenada por identificador/preço via **Árvore Binária de Busca** (`ArvoreBinariaBusca<T>`) e consultas rápidas $O(\log n)$ via algoritmo de **Busca Binária** (`buscaBinaria`).

---

## 2. Tabela de Complexidade Assintótica (Big-O)

Abaixo está o comparativo teórico de complexidade de tempo e espaço de cada estrutura implementada:

| Estrutura / Algoritmo | Operação Principal | Melhor Caso | Caso Médio | Pior Caso | Complexidade Espacial |
|---|---|:---:|:---:|:---:|:---:|
| **Lista Duplamente Encadeada** | Inserção no início/fim | $O(1)$ | $O(1)$ | $O(1)$ | $O(n)$ |
| **Lista (Inserção Ordenada)** | Inserção mantendo ordem | $O(1)$ | $O(n)$ | $O(n)$ | $O(n)$ |
| **Lista Encadeada** | Busca linear por chave | $O(1)$ | $O(n)$ | $O(n)$ | $O(n)$ |
| **Fila (FIFO Encadeada)** | Enfileirar / Desenfileirar | $O(1)$ | $O(1)$ | $O(1)$ | $O(n)$ |
| **Pilha (LIFO Encadeada)** | Empilhar / Desempilhar (Undo) | $O(1)$ | $O(1)$ | $O(1)$ | $O(n)$ |
| **Tabela Hash (Separate Chaining)** | Inserção / Busca / Remoção | $O(1)$ | $O(1)$ | $O(n)$ | $O(n + m)$ |
| **Árvore Binária de Busca (BST)** | Inserção / Busca / Remoção | $O(1)$ | $O(\log n)$ | $O(n)$ | $O(n)$ |
| **Busca Binária (Array)** | Localização de elemento | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(1)$ iterativo / $O(\log n)$ recursivo |

---

## 3. Detalhamento dos Componentes Implementados em C++17

### 3.1. Lista Duplamente Encadeada (`aed/include/ListaEncadeada.hpp`)
- Nós duplamente encadeados (`NoDuplo<T>`) com ponteiros `anterior` e `proximo`.
- Gerenciamento de memória com RAII, evitando vazamentos (*memory leaks*).
- Método `inserirOrdenado(const T&, Comparador comp)`: insere mantendo os itens estritamente ordenados segundo critério arbitrário (ex.: prioridade de saída ou prazo de validade).

### 3.2. Fila FIFO de Pedidos (`aed/include/Fila.hpp`)
- Implementada com nós encadeados e ponteiros para `inicio_` e `fim_`, garantindo complexidade $O(1)$ tanto para `enfileirar` quanto para `desenfileirar`.
- Métodos auxiliares: `espiar`, `estaVazia`, `tamanho` e `paraVetor`.

### 3.3. Pilha LIFO de Desfazer (`aed/include/Pilha.hpp`)
- Implementada com nós encadeados e ponteiro de `topo_` garantindo $O(1)$ estrito em `empilhar` e `desempilhar`.
- Serve como base para o padrão *Command / Undo*: cada alteração no estoque empilha o estado anterior para possibilitar reversão imediata.

### 3.4. Gerenciador Comercial de Estoque (`aed/include/GerenciadorEstoque.hpp` e `aed/src/GerenciadorEstoque.cpp`)
- Unifica `ListaEncadeada` (estoque ordenado por prioridade/validade), `Fila` (pedidos pendentes) e `Pilha` (histórico de operações).
- `cadastrarProduto(item)`: insere no estoque mantendo a ordenação.
- `solicitarPedido(pedido)`: enfileira a requisição na Fila FIFO.
- `processarProximoPedido()`: atende o pedido no início da fila, dá baixa no estoque e registra na pilha.
- `desfazerUltimaOperacao()`: desempilha a última operação e restaura a quantidade anterior no estoque.

### 3.5. Tabela Hash com Encadeamento (`aed/include/TabelaHash.hpp`)
- Índice direto por código do produto (`PRD-XXXXXX`).
- Encadeamento separado com `std::list` em cada bucket para tratar colisões.
- Função Hash polinomial djb2 / Horner para strings.
- Monitoramento de fator de carga com redimensionamento dinâmico (`rehash`) dobrando a capacidade quando $\text{fator} > 0.75$.

### 3.6. Árvore Binária de Busca (`aed/include/ArvoreBinariaBusca.hpp`)
- BST genérica com suporte a comparadores customizados.
- Remoção completa cobrindo os 3 casos:
  1. Nó folha (sem filhos);
  2. Nó com 1 filho;
  3. Nó com 2 filhos (substituição pelo sucessor em-ordem).
- Percursos `emOrdem` (ordem crescente), `preOrdem` e `posOrdem`.

### 3.7. Algoritmos de Busca Binária (`aed/include/BuscaBinaria.hpp`)
- Implementações iterativa (`buscaBinaria`) e recursiva (`buscaBinariaRecursiva`).
- Estrutura `ResultadoBusca` registrando índice, flag de sucesso e número exato de comparações efetuadas para comprovação empírica de $\le \log_2(n) + 1$.

---

## 4. Testes com Dados Sintéticos e Análise de Desempenho

O programa de benchmark em `aed/src/benchmark.cpp` gera volumes sintéticos de produtos em 5 escalas: $N = 100, 1.000, 10.000, 50.000$ e $100.000$ itens.

### Resultados Empíricos Obtidos no Benchmark (C++17, gcc -O2)

| Volume ($N$) | Hash Ins (ms) | Hash Busca (ms) | BST Ins (ms) | BST Busca (ms) | Busca Binária (ms) | Média Comparações Binária | Busca Linear Lista (ms) | Fila $O(1)$ (ms) | Pilha $O(1)$ (ms) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **100** | 0.0615 | **0.0080** | 0.0176 | 0.0069 | 0.0044 | **5.8** | 0.0132 | 0.0153 | 0.0147 |
| **1.000** | 0.4319 | **0.0068** | 0.2209 | 0.0124 | 0.0087 | **9.0** | 0.1184 | 0.1429 | 0.1388 |
| **10.000** | 4.3707 | **0.0078** | 2.2471 | 0.0171 | 0.0138 | **12.1** | 0.6915 | 0.7417 | 0.7649 |
| **50.000** | 12.8459 | **0.0129** | 14.7429 | 0.0280 | 0.0325 | **14.1** | *Inviável $O(N)$* | 6.3945 | 3.7429 |
| **100.000** | 24.1520 | **0.0176** | 49.7257 | **0.0528** | **0.0287** | **15.0** | *Inviável $O(N)$* | 12.4710 | 8.1398 |

### Conclusões da Análise
1. **Confirmação Logarítmica:** Na Busca Binária, a média de comparações com 100.000 itens foi de apenas **15.0 comparações** ($\log_2 100.000 \approx 16.6$), confirmando a eficiência assintótica $O(\log n)$.
2. **Tempo Constante no Hash:** Mesmo para 100.000 registros, a busca na **Tabela Hash** levou apenas **0.0176 milissegundos** devido à dispersão polinomial eficiente e encadeamento separado.
3. **Escala de Fila e Pilha:** As operações de enfileiramento e empilhamento executam em tempo constante $O(1)$ por item, totalizando poucos milissegundos para 100.000 movimentações completas.

---

## 5. Como Compilar e Rodar

Na raiz do repositório ou dentro da pasta `aed/`:

```bash
cd aed

# Compilar e rodar toda a suíte de testes unitários em C++
make test

# Compilar e rodar o benchmark de complexidade com dados sintéticos
make benchmark
```
