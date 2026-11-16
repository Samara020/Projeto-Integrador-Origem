#include <iostream>
#include <iomanip>
#include <vector>
#include <string>
#include <chrono>
#include <algorithm>
#include <random>

#include "ListaEncadeada.hpp"
#include "Fila.hpp"
#include "Pilha.hpp"
#include "GerenciadorEstoque.hpp"
#include "TabelaHash.hpp"
#include "ArvoreBinariaBusca.hpp"
#include "BuscaBinaria.hpp"

using namespace aed;

struct ProdutoSintetico {
    int id;
    std::string codigo;
    std::string nome;
    double preco;
    int prioridadeSaida;
    std::string validade;

    bool operator<(const ProdutoSintetico& outro) const {
        return id < outro.id;
    }
};

struct MetricaVolume {
    int volume;
    double hashInsMs;
    double hashBuscaMs;
    double bstInsMs;
    double bstBuscaMs;
    double buscaBinMs;
    double mediaCompBin;
    double buscaLinearMs;
    double filaMs;
    double pilhaMs;
};

std::vector<ProdutoSintetico> gerarProdutos(int n) {
    std::vector<ProdutoSintetico> lista;
    lista.reserve(n);
    const std::vector<std::string> cats = {"Ceramica", "Madeira", "Xilogravura", "Renda", "Couro"};

    for (int i = 1; i <= n; ++i) {
        ProdutoSintetico p;
        p.id = i;
        char buf[32];
        std::snprintf(buf, sizeof(buf), "PRD-%06d", i);
        p.codigo = buf;
        p.nome = "Peca " + cats[i % cats.size()] + " #" + std::to_string(i);
        p.preco = 20.0 + (i * 17 % 500);
        p.prioridadeSaida = (i * 7 % 10) + 1;
        p.validade = "2027-01-01";
        lista.push_back(p);
    }
    return lista;
}

int main() {
    std::cout << "================================================================================\n";
    std::cout << "  ORIGEM · BENCHMARK E ANÁLISE DE COMPLEXIDADE EM C++ (AED — UNIDADE 2)        \n";
    std::cout << "================================================================================\n\n";

    std::vector<int> volumes = {100, 1000, 10000, 50000, 100000};
    std::vector<MetricaVolume> relatorio;

    for (int n : volumes) {
        std::cout << "--> Executando testes com volume sintético: N = " << n << " itens...\n";
        auto produtos = gerarProdutos(n);

        int qtdBuscas = std::min(100, n);
        std::vector<ProdutoSintetico> amostras;
        amostras.reserve(qtdBuscas);
        for (int i = 0; i < qtdBuscas; ++i) {
            int idx = (i * (n - 1)) / qtdBuscas;
            amostras.push_back(produtos[idx]);
        }

        // 1. Tabela Hash (Índice de estoque por código)
        TabelaHash<std::string, ProdutoSintetico> tabela(std::max(16, n / 2));
        auto t0 = std::chrono::high_resolution_clock::now();
        for (const auto& p : produtos) {
            tabela.inserir(p.codigo, p);
        }
        auto t1 = std::chrono::high_resolution_clock::now();
        double hashInsMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        t0 = std::chrono::high_resolution_clock::now();
        ProdutoSintetico resHash;
        for (const auto& a : amostras) {
            tabela.buscar(a.codigo, resHash);
        }
        t1 = std::chrono::high_resolution_clock::now();
        double hashBuscaMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        // 2. BST (Árvore Binária de Busca)
        // Embaralha para inserção de distribuição balanceada
        auto embaralhados = produtos;
        std::mt19937 g(12345);
        std::shuffle(embaralhados.begin(), embaralhados.end(), g);

        ArvoreBinariaBusca<ProdutoSintetico> bst;
        t0 = std::chrono::high_resolution_clock::now();
        for (const auto& p : embaralhados) {
            bst.inserir(p);
        }
        t1 = std::chrono::high_resolution_clock::now();
        double bstInsMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        t0 = std::chrono::high_resolution_clock::now();
        ProdutoSintetico resBst;
        for (const auto& a : amostras) {
            bst.buscar(a, resBst);
        }
        t1 = std::chrono::high_resolution_clock::now();
        double bstBuscaMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        // 3. Busca Binária
        auto ordenados = produtos; // já está ordenado por ID
        auto compTresVias = [](const ProdutoSintetico& a, int idAlvo) {
            if (a.id < idAlvo) return -1;
            if (a.id > idAlvo) return 1;
            return 0;
        };

        long long totalComp = 0;
        t0 = std::chrono::high_resolution_clock::now();
        for (const auto& a : amostras) {
            auto res = buscaBinaria(ordenados, a.id, compTresVias);
            totalComp += res.comparacoes;
        }
        t1 = std::chrono::high_resolution_clock::now();
        double buscaBinMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
        double mediaComp = static_cast<double>(totalComp) / qtdBuscas;

        // 4. Busca Linear em Lista Encadeada (para comparação de O(n))
        double buscaLinearMs = -1.0;
        if (n <= 10000) {
            ListaEncadeada<ProdutoSintetico> lista;
            for (const auto& p : produtos) {
                lista.adicionarNoFim(p);
            }
            t0 = std::chrono::high_resolution_clock::now();
            auto vetorLista = lista.paraVetor();
            for (const auto& a : amostras) {
                for (const auto& item : vetorLista) {
                    if (item.codigo == a.codigo) break;
                }
            }
            t1 = std::chrono::high_resolution_clock::now();
            buscaLinearMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
        }

        // 5. Fila FIFO (O(1))
        Fila<ProdutoSintetico> fila;
        t0 = std::chrono::high_resolution_clock::now();
        for (const auto& p : produtos) {
            fila.enfileirar(p);
        }
        while (!fila.estaVazia()) {
            fila.desenfileirar();
        }
        t1 = std::chrono::high_resolution_clock::now();
        double filaMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        // 6. Pilha LIFO (O(1))
        Pilha<ProdutoSintetico> pilha;
        t0 = std::chrono::high_resolution_clock::now();
        for (const auto& p : produtos) {
            pilha.empilhar(p);
        }
        while (!pilha.estaVazia()) {
            pilha.desempilhar();
        }
        t1 = std::chrono::high_resolution_clock::now();
        double pilhaMs = std::chrono::duration<double, std::milli>(t1 - t0).count();

        relatorio.push_back({n, hashInsMs, hashBuscaMs, bstInsMs, bstBuscaMs, buscaBinMs, mediaComp, buscaLinearMs, filaMs, pilhaMs});
    }

    std::cout << "\n========================================================================================================\n";
    std::cout << "  TABELA COMPARATIVA: TEMPO DE EXECUÇÃO EM MILISSEGUNDOS (C++17)                                         \n";
    std::cout << "========================================================================================================\n";
    std::cout << std::left
              << std::setw(10) << "Volume"
              << std::setw(15) << "Hash Ins(ms)"
              << std::setw(15) << "Hash Busca"
              << std::setw(15) << "BST Ins(ms)"
              << std::setw(15) << "BST Busca"
              << std::setw(14) << "BuscaBin(ms)"
              << std::setw(14) << "Média Comp"
              << std::setw(14) << "Linear(ms)"
              << std::setw(12) << "Fila(ms)"
              << std::setw(12) << "Pilha(ms)"
              << "\n";
    std::cout << "--------------------------------------------------------------------------------------------------------\n";

    for (const auto& r : relatorio) {
        std::cout << std::left
                  << std::setw(10) << r.volume
                  << std::setw(15) << std::fixed << std::setprecision(4) << r.hashInsMs
                  << std::setw(15) << std::fixed << std::setprecision(4) << r.hashBuscaMs
                  << std::setw(15) << std::fixed << std::setprecision(4) << r.bstInsMs
                  << std::setw(15) << std::fixed << std::setprecision(4) << r.bstBuscaMs
                  << std::setw(14) << std::fixed << std::setprecision(4) << r.buscaBinMs
                  << std::setw(14) << std::fixed << std::setprecision(1) << r.mediaCompBin;
        if (r.buscaLinearMs >= 0) {
            std::cout << std::setw(14) << std::fixed << std::setprecision(4) << r.buscaLinearMs;
        } else {
            std::cout << std::setw(14) << "N/A (O(N))";
        }
        std::cout << std::setw(12) << std::fixed << std::setprecision(4) << r.filaMs
                  << std::setw(12) << std::fixed << std::setprecision(4) << r.pilhaMs
                  << "\n";
    }
    std::cout << "========================================================================================================\n";

    // Demonstração do Gerenciador de Estoque Comercial (Lista ordenada + Fila + Pilha de Undo)
    std::cout << "\n--> Demonstracao do fluxo comercial em C++ com GerenciadorEstoque:\n";
    GerenciadorEstoque estoque;

    ItemEstoque i1;
    i1.id = "1"; i1.produtoId = "PRD-001"; i1.nome = "Vaso Barro Maragogipinho";
    i1.quantidade = 10; i1.prioridadeSaida = 2; i1.validade = "2026-12-31";
    estoque.cadastrarProduto(i1);

    ItemEstoque i2;
    i2.id = "2"; i2.produtoId = "PRD-002"; i2.nome = "Queijo Coalho Tradicional";
    i2.quantidade = 6; i2.prioridadeSaida = 1; i2.validade = "2026-05-10";
    estoque.cadastrarProduto(i2);

    std::cout << "Estoque inicial ordenado por prioridade de saida:\n";
    for (const auto& item : estoque.listarEstoque()) {
        std::cout << "  - [Prioridade " << item.prioridadeSaida << "] " << item.nome << " | Qtd: " << item.quantidade << "\n";
    }

    std::cout << "Recebendo pedido na Fila (FIFO)...\n";
    PedidoRequisicao ped{"PED-100", "PRD-002", 4};
    estoque.solicitarPedido(ped);

    std::cout << "Processando pedido da fila...\n";
    auto atendido = estoque.processarProximoPedido();
    std::cout << "  Pedido atendido: " << atendido.id << " de " << atendido.quantidade << " unidades de " << atendido.produtoId << "\n";

    std::cout << "Estoque pos-baixa:\n";
    for (const auto& item : estoque.listarEstoque()) {
        std::cout << "  - " << item.nome << " | Qtd: " << item.quantidade << "\n";
    }

    std::cout << "Cliente desistiu da compra. Acionando Desfazer (Undo via Pilha LIFO)...\n";
    bool desfez = estoque.desfazerUltimaOperacao();
    std::cout << "  Desfazer concluido: " << (desfez ? "SIM" : "NAO") << "\n";

    std::cout << "Estoque restaurado:\n";
    for (const auto& item : estoque.listarEstoque()) {
        std::cout << "  - " << item.nome << " | Qtd: " << item.quantidade << "\n";
    }
    std::cout << "================================================================================\n\n";

    return 0;
}
