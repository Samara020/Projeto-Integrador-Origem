CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -Iinclude
BIN_DIR = bin

all: dirs $(BIN_DIR)/test_estruturas $(BIN_DIR)/test_buscas $(BIN_DIR)/benchmark

dirs:
	@mkdir -p $(BIN_DIR)

$(BIN_DIR)/test_estruturas: tests/test_estruturas.cpp src/GerenciadorEstoque.cpp | dirs
	$(CXX) $(CXXFLAGS) tests/test_estruturas.cpp src/GerenciadorEstoque.cpp -o $@

$(BIN_DIR)/test_buscas: tests/test_buscas.cpp | dirs
	$(CXX) $(CXXFLAGS) tests/test_buscas.cpp -o $@

$(BIN_DIR)/benchmark: src/benchmark.cpp src/GerenciadorEstoque.cpp | dirs
	$(CXX) $(CXXFLAGS) src/benchmark.cpp src/GerenciadorEstoque.cpp -o $@

test: dirs $(BIN_DIR)/test_estruturas $(BIN_DIR)/test_buscas
	@echo "=========================================="
	@echo "Executando Testes de Estruturas Lineares..."
	@echo "=========================================="
	./$(BIN_DIR)/test_estruturas
	@echo "=========================================="
	@echo "Executando Testes de Buscas e Hash..."
	@echo "=========================================="
	./$(BIN_DIR)/test_buscas
	@echo "=========================================="
	@echo "Todos os testes em C++ passaram com 100%!"
	@echo "=========================================="

benchmark: dirs $(BIN_DIR)/benchmark
	./$(BIN_DIR)/benchmark

clean:
	rm -rf $(BIN_DIR) tests/test_estruturas tests/test_buscas tests/test_buscas_asan

.PHONY: all dirs test benchmark clean
