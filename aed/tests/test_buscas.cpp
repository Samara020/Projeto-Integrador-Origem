#include <cassert>
#include <iostream>
#include <vector>
#include <string>
#include <cmath>

#include "TabelaHash.hpp"
#include "ArvoreBinariaBusca.hpp"
#include "BuscaBinaria.hpp"

static int testes_passados = 0;
#define TESTE(nome) std::cout << "  [executa] " << nome << std::endl

int main() {
    // =====================================================================
    // TabelaHash
    // =====================================================================
    {
        TESTE("TabelaHash: insercao e busca");
        TabelaHash<std::string, int> tabela;
        tabela.inserir("P001", 10);
        tabela.inserir("P002", 20);
        int saida = 0;
        assert(tabela.buscar("P001", saida) && saida == 10);
        assert(tabela.buscar("P002", saida) && saida == 20);
        assert(tabela.tamanho() == 2);
        assert(tabela.contem("P001"));
        assert(!tabela.contem("NAO_EXISTE"));
        testes_passados++;
    }

    {
        TESTE("TabelaHash: atualizacao de chave existente nao aumenta tamanho");
        TabelaHash<std::string, int> tabela;
        tabela.inserir("A", 1);
        tabela.inserir("A", 99);
        int saida = 0;
        assert(tabela.buscar("A", saida) && saida == 99);
        assert(tabela.tamanho() == 1);
        testes_passados++;
    }

    {
        TESTE("TabelaHash: remocao");
        TabelaHash<std::string, int> tabela;
        tabela.inserir("A", 1);
        tabela.inserir("B", 2);
        assert(tabela.remover("A"));
        assert(!tabela.contem("A"));
        assert(tabela.contem("B"));
        assert(tabela.tamanho() == 1);
        assert(!tabela.remover("Z")); // inexistente
        testes_passados++;
    }

    {
        TESTE("TabelaHash: chaves e valores");
        TabelaHash<std::string, int> tabela;
        tabela.inserir("X", 1);
        tabela.inserir("Y", 2);
        tabela.inserir("Z", 3);
        auto c = tabela.chaves();
        auto v = tabela.valores();
        assert(c.size() == 3);
        assert(v.size() == 3);
        testes_passados++;
    }

    {
        TESTE("TabelaHash: forca colisoes e recupera tudo");
        TabelaHash<std::string, int> tabela(4);
        const int total = 50;
        for (int i = 0; i < total; i++) {
            tabela.inserir("chave-" + std::to_string(i), i);
        }
        assert(tabela.tamanho() == static_cast<std::size_t>(total));
        for (int i = 0; i < total; i++) {
            int saida = 0;
            assert(tabela.buscar("chave-" + std::to_string(i), saida) && saida == i);
        }
        testes_passados++;
    }

    {
        TESTE("TabelaHash: rehash automatico quando fator de carga > 0.75");
        TabelaHash<std::string, int> tabela(4);
        for (int i = 0; i < 12; i++) {
            tabela.inserir("k" + std::to_string(i), i);
        }
        assert(tabela.tamanho() == 12);
        assert(tabela.fatorDeCarga() <= 0.75);
        assert(tabela.capacidade() >= 8); // dobrou ao menos uma vez
        for (int i = 0; i < 12; i++) {
            int saida = 0;
            assert(tabela.buscar("k" + std::to_string(i), saida) && saida == i);
        }
        testes_passados++;
    }

    {
        TESTE("TabelaHash: rehash preserva apos remocoes e reinsercoes");
        TabelaHash<std::string, int> tabela(4);
        for (int i = 0; i < 12; i++) tabela.inserir("k" + std::to_string(i), i);
        tabela.remover("k0");
        tabela.remover("k1");
        tabela.inserir("k100", 100);
        int saida = 0;
        assert(tabela.buscar("k100", saida) && saida == 100);
        assert(!tabela.contem("k0"));
        assert(!tabela.contem("k1"));
        testes_passados++;
    }

    {
        TESTE("TabelaHash: chaves numericas");
        TabelaHash<int, std::string> tabela;
        tabela.inserir(101, "produto A");
        tabela.inserir(202, "produto B");
        std::string saida;
        assert(tabela.buscar(101, saida) && saida == "produto A");
        assert(!tabela.contem(999));
        assert(tabela.tamanho() == 2);
        testes_passados++;
    }

    {
        TESTE("TabelaHash: limpar");
        TabelaHash<std::string, int> tabela;
        tabela.inserir("A", 1);
        tabela.inserir("B", 2);
        tabela.limpar();
        assert(tabela.tamanho() == 0);
        assert(!tabela.contem("A"));
        testes_passados++;
    }

    // =====================================================================
    // ArvoreBinariaBusca
    // =====================================================================
    {
        TESTE("BST: insercao desordenada e em-ordem estritamente ordenada");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80, 10, 25};
        for (int n : nums) arvore.inserir(n);
        auto ordem = arvore.emOrdem();
        std::vector<int> esperado = {10, 20, 25, 30, 40, 50, 60, 70, 80};
        assert(ordem == esperado);
        for (std::size_t i = 1; i < ordem.size(); i++) {
            assert(ordem[i] > ordem[i - 1]);
        }
        assert(arvore.tamanho() == 9);
        assert(!arvore.estaVazia());
        testes_passados++;
    }

    {
        TESTE("BST: vazia");
        ArvoreBinariaBusca<int> arvore;
        assert(arvore.estaVazia());
        assert(arvore.tamanho() == 0);
        assert(arvore.emOrdem().empty());
        int saida = 0;
        assert(!arvore.minimo(saida));
        assert(!arvore.maximo(saida));
        assert(arvore.altura() == 0);
        testes_passados++;
    }

    {
        TESTE("BST: busca existente e inexistente");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80};
        for (int n : nums) arvore.inserir(n);
        int saida = 0;
        assert(arvore.buscar(50, saida) && saida == 50);
        assert(arvore.buscar(20, saida) && saida == 20);
        assert(arvore.buscar(80, saida) && saida == 80);
        assert(!arvore.buscar(100, saida));
        assert(!arvore.buscar(-5, saida));
        testes_passados++;
    }

    {
        TESTE("BST: minimo e maximo");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80};
        for (int n : nums) arvore.inserir(n);
        int saida = 0;
        assert(arvore.minimo(saida) && saida == 20);
        assert(arvore.maximo(saida) && saida == 80);
        testes_passados++;
    }

    {
        TESTE("BST: percurso pre-ordem e pos-ordem");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80};
        for (int n : nums) arvore.inserir(n);
        auto pre = arvore.preOrdem();
        auto pos = arvore.posOrdem();
        assert(!pre.empty() && pre[0] == 50);
        assert(!pos.empty() && pos.back() == 50);
        assert(pre.size() == arvore.tamanho());
        assert(pos.size() == arvore.tamanho());
        testes_passados++;
    }

    {
        TESTE("BST: altura");
        ArvoreBinariaBusca<int> arvore;
        assert(arvore.altura() == 0);
        arvore.inserir(10);
        assert(arvore.altura() == 1);
        arvore.inserir(5);
        arvore.inserir(15);
        assert(arvore.altura() == 2);
        testes_passados++;
    }

    {
        TESTE("BST: remocao de no folha (sem filhos)");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80, 10, 25};
        for (int n : nums) arvore.inserir(n);
        assert(arvore.remover(10));
        assert(arvore.tamanho() == 8);
        int _s1;
        assert(!arvore.buscar(10, _s1));
        auto ordem = arvore.emOrdem();
        std::vector<int> esperado = {20, 25, 30, 40, 50, 60, 70, 80};
        assert(ordem == esperado);
        testes_passados++;
    }

    {
        TESTE("BST: remocao de no com um filho");
        ArvoreBinariaBusca<int> arvore;
        arvore.inserir(10);
        arvore.inserir(5);
        arvore.inserir(30);
        arvore.inserir(20);
        assert(arvore.remover(30));
        int _s2;
        assert(!arvore.buscar(30, _s2));
        auto ordem = arvore.emOrdem();
        std::vector<int> esperado = {5, 10, 20};
        assert(ordem == esperado);
        testes_passados++;
    }

    {
        TESTE("BST: remocao de no com dois filhos (sucessor in-order)");
        ArvoreBinariaBusca<int> arvore;
        int nums[] = {50, 30, 70, 20, 40, 60, 80, 10, 25};
        for (int n : nums) arvore.inserir(n);
        assert(arvore.remover(50));
        int _s3;
        assert(!arvore.buscar(50, _s3));
        assert(arvore.tamanho() == 8);
        auto ordem = arvore.emOrdem();
        std::vector<int> esperado = {10, 20, 25, 30, 40, 60, 70, 80};
        assert(ordem == esperado);
        for (std::size_t i = 1; i < ordem.size(); i++) {
            assert(ordem[i] > ordem[i - 1]);
        }
        testes_passados++;
    }

    {
        TESTE("BST: remocao de raiz unica");
        ArvoreBinariaBusca<int> arvore;
        arvore.inserir(42);
        assert(arvore.remover(42));
        assert(arvore.estaVazia());
        assert(arvore.tamanho() == 0);
        testes_passados++;
    }

    {
        TESTE("BST: remocao de chave inexistente retorna falso");
        ArvoreBinariaBusca<int> arvore;
        arvore.inserir(10);
        assert(!arvore.remover(99));
        assert(arvore.tamanho() == 1);
        testes_passados++;
    }

    {
        TESTE("BST: limpar");
        ArvoreBinariaBusca<int> arvore;
        arvore.inserir(5);
        arvore.inserir(3);
        arvore.inserir(7);
        arvore.limpar();
        assert(arvore.estaVazia());
        assert(arvore.tamanho() == 0);
        testes_passados++;
    }

    // =====================================================================
    // Busca Binaria
    // =====================================================================
    auto comp = [](int a, int b) {
        if (a < b) return -1;
        if (b < a) return 1;
        return 0;
    };

    {
        TESTE("BuscaBinaria: array impar encontra no meio");
        std::vector<int> arr = {1, 3, 5, 7, 9, 11, 13};
        auto r = buscaBinaria(arr, 7, comp);
        assert(r.encontrado && r.index == 3);
        assert(r.comparacoes > 0);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: array par");
        std::vector<int> arr = {2, 4, 6, 8, 10, 12};
        auto r1 = buscaBinaria(arr, 8, comp);
        assert(r1.encontrado);
        auto r2 = buscaBinaria(arr, 2, comp);
        assert(r2.encontrado && r2.index == 0);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: primeiro e ultimo elementos");
        std::vector<int> arr = {5, 10, 15, 20, 25};
        auto r1 = buscaBinaria(arr, 5, comp);
        assert(r1.encontrado && r1.index == 0);
        auto r2 = buscaBinaria(arr, 25, comp);
        assert(r2.encontrado && r2.index == 4);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: elemento ausente");
        std::vector<int> arr = {1, 2, 3, 4, 5};
        auto r = buscaBinaria(arr, 99, comp);
        assert(!r.encontrado && r.index == -1);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: array de um elemento");
        std::vector<int> arr = {42};
        auto r = buscaBinaria(arr, 42, comp);
        assert(r.encontrado && r.index == 0);
        auto ausente = buscaBinaria(arr, 7, comp);
        assert(!ausente.encontrado && ausente.index == -1);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: array vazio");
        std::vector<int> arr;
        auto r = buscaBinaria(arr, 1, comp);
        assert(!r.encontrado && r.index == -1 && r.comparacoes == 0);
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria recursiva equivale a iterativa");
        std::vector<int> arr = {1, 3, 5, 7, 9, 11, 13, 15};
        int chaves[] = {1, 5, 8, 15, 16};
        for (int chave : chaves) {
            auto a = buscaBinaria(arr, chave, comp);
            auto b = buscaBinariaRecursiva(arr, chave, comp);
            assert(a.encontrado == b.encontrado);
            assert(a.index == b.index);
        }
        testes_passados++;
    }

    {
        TESTE("BuscaBinaria: comparacoes <= log2(n) + 1");
        int ns[] = {1, 2, 3, 7, 8, 15, 16, 31, 32, 100, 1000};
        for (int n : ns) {
            std::vector<int> arr(n);
            for (int i = 0; i < n; i++) arr[i] = i + 1;
            int limite = static_cast<int>(std::log2(static_cast<double>(n))) + 1;
            int chaves[] = {1, n / 2, n, n + 1};
            for (int chave : chaves) {
                auto a = buscaBinaria(arr, chave, comp);
                auto b = buscaBinariaRecursiva(arr, chave, comp);
                assert(a.comparacoes <= limite);
                assert(b.comparacoes <= limite);
            }
        }
        testes_passados++;
    }

    std::cout << "\nTodos os " << testes_passados << " grupos de teste passaram!\n";
    return 0;
}
