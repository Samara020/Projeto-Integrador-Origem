# Módulo de Algoritmos e Estruturas de Dados (AED) em C++17 — Sistema Origem

Este módulo implementa a solução de **Estruturas de Dados e Algoritmos de Busca** em **C++ moderno (C++17)** para atender aos requisitos da disciplina de **AED (Unidade 2)** no marketplace **Origem**.

---

## 1. Estrutura do Diretório

```text
aed/
├── include/
│   ├── ListaEncadeada.hpp       # Lista Duplamente Encadeada com inserção ordenada
│   ├── Fila.hpp                 # Fila FIFO encadeada (O(1))
│   ├── Pilha.hpp                # Pilha LIFO encadeada (O(1)) com suporte a Desfazer
│   ├── GerenciadorEstoque.hpp   # Gerenciador comercial unificando Lista, Fila e Pilha
│   ├── TabelaHash.hpp           # Índice de estoque por código com separate chaining e rehash
│   ├── ArvoreBinariaBusca.hpp   # BST com percursos e remoção nos 3 casos
│   └── BuscaBinaria.hpp         # Busca Binária iterativa e recursiva com contagem
├── src/
│   ├── GerenciadorEstoque.cpp   # Implementação dos métodos do estoque comercial
│   └── benchmark.cpp            # Testes empíricos com volumes sintéticos (100 a 100.000)
├── tests/
│   ├── test_estruturas.cpp      # Testes unitários de Lista, Fila, Pilha e Undo
│   └── test_buscas.cpp          # Testes unitários de Hash, BST e Busca Binária
└── Makefile                     # Script de compilação automatizada
```

---

## 2. Compilação e Execução

### Pré-requisitos
- Compilador C++17 (`g++ >= 9` ou `clang++`)
- `make`

### Rodar os Testes Automatizados
```bash
cd aed
make test
```
*Executa todos os testes unitários com asserções estritas, cobrindo casos de borda, vazios, colisões e remoções.*

### Rodar o Benchmark e Análise de Complexidade
```bash
cd aed
make benchmark
```
*Gera conjuntos sintéticos de dados em 5 volumes ($N = 100, 1.000, 10.000, 50.000, 100.000$), mede tempos de execução com `std::chrono` e imprime a tabela comparativa.*

### Limpar os Binários Gerados
```bash
cd aed
make clean
```
