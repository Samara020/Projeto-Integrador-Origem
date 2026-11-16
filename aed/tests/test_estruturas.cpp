#include <cassert>
#include <iostream>
#include <string>
#include <vector>

#include "Fila.hpp"
#include "GerenciadorEstoque.hpp"
#include "ListaEncadeada.hpp"
#include "Pilha.hpp"

using namespace aed;

void testeListaVazia() {
    ListaEncadeada<int> l;
    assert(l.tamanho() == 0u);
    assert(l.estaVazia());
    assert(l.paraVetor().empty());
    bool lancou = false;
    try {
        l.removerDoInicio();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
    lancou = false;
    try {
        l.removerDoFim();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
    lancou = false;
    try {
        l.obter(0);
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
}

void testeListaAdicaoRemocao() {
    ListaEncadeada<int> l;
    l.adicionarNoFim(1);
    l.adicionarNoFim(2);
    l.adicionarNoInicio(0);
    assert(l.tamanho() == 3u);
    assert(l.obter(0) == 0);
    assert(l.obter(1) == 1);
    assert(l.obter(2) == 2);
    assert(l.removerDoInicio() == 0);
    assert(l.removerDoFim() == 2);
    assert(l.tamanho() == 1u);
    assert(l.obter(0) == 1);
    l.limpar();
    assert(l.tamanho() == 0u);
    assert(l.estaVazia());
    assert(l.paraVetor().empty());
}

void testeListaInserirOrdenado() {
    ListaEncadeada<int> l;
    auto comp = [](int a, int b) { return a < b; };
    l.inserirOrdenado(5, comp);
    l.inserirOrdenado(3, comp);
    l.inserirOrdenado(7, comp);
    l.inserirOrdenado(4, comp);
    assert(l.tamanho() == 4u);
    assert(l.obter(0) == 3);
    assert(l.obter(1) == 4);
    assert(l.obter(2) == 5);
    assert(l.obter(3) == 7);
    std::vector<int> v = l.paraVetor();
    assert(v.size() == 4u);
    assert(v[0] == 3 && v[1] == 4 && v[2] == 5 && v[3] == 7);

    // ordenacao por prioridade (menor primeiro)
    struct Item {
        std::string nome;
        int prioridade;
    };
    ListaEncadeada<Item> li;
    auto compItem = [](const Item& a, const Item& b) {
        return a.prioridade < b.prioridade;
    };
    li.inserirOrdenado({"baixa", 5}, compItem);
    li.inserirOrdenado({"alta", 1}, compItem);
    li.inserirOrdenado({"media", 3}, compItem);
    assert(li.obter(0).nome == "alta");
    assert(li.obter(1).nome == "media");
    assert(li.obter(2).nome == "baixa");
}

void testeFilaVazia() {
    Fila<int> f;
    assert(f.estaVazia());
    assert(f.tamanho() == 0u);
    assert(f.paraVetor().empty());
    bool lancou = false;
    try {
        f.desenfileirar();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
    lancou = false;
    try {
        f.espiar();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
}

void testeFilaFIFO() {
    Fila<std::string> f;
    f.enfileirar("a");
    f.enfileirar("b");
    f.enfileirar("c");
    assert(f.tamanho() == 3u);
    assert(f.espiar() == "a");
    assert(f.desenfileirar() == "a");
    assert(f.desenfileirar() == "b");
    assert(f.tamanho() == 1u);
    assert(f.desenfileirar() == "c");
    assert(f.estaVazia());
    assert(f.paraVetor().empty());
}

void testePilhaVazia() {
    Pilha<int> p;
    assert(p.estaVazia());
    assert(p.tamanho() == 0u);
    bool lancou = false;
    try {
        p.desempilhar();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
    lancou = false;
    try {
        p.topo();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);
}

void testePilhaLIFO() {
    Pilha<int> p;
    p.empilhar(1);
    p.empilhar(2);
    p.empilhar(3);
    assert(p.tamanho() == 3u);
    assert(p.topo() == 3);
    assert(p.desempilhar() == 3);
    assert(p.desempilhar() == 2);
    assert(p.tamanho() == 1u);
    assert(p.desempilhar() == 1);
    assert(p.estaVazia());
    assert(p.paraVetor().empty());
}

void testeGerenciadorEstoque() {
    GerenciadorEstoque g;
    assert(g.totalOperacoesHistorico() == 0u);
    assert(g.listarEstoque().empty());
    assert(g.listarFilaPedidos().empty());

    // cadastra produtos (ordenado por prioridadeSaida/validade)
    g.cadastrarProduto({"1", "p1", "Bordado", 10, 2, "2027-01-01"});
    g.cadastrarProduto({"2", "p2", "Renda", 5, 1, "2026-12-01"});
    g.cadastrarProduto({"3", "p3", "Tricot", 8, 1, "2026-11-01"});
    assert(g.listarEstoque().size() == 3u);
    std::vector<ItemEstoque> est = g.listarEstoque();
    assert(est[0].produtoId == "p3");  // prioridade 1, validade mais antiga
    assert(est[1].produtoId == "p2");  // prioridade 1
    assert(est[2].produtoId == "p1");  // prioridade 2

    // atualiza produto existente
    g.cadastrarProduto({"2", "p2", "Renda Atualizada", 20, 1, "2026-12-01"});
    assert(g.listarEstoque().size() == 3u);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p2") {
            assert(e.nome == "Renda Atualizada");
            assert(e.quantidade == 20);
        }
    }

    // fila de pedidos
    g.solicitarPedido({"pd1", "p1", 3});
    g.solicitarPedido({"pd2", "p2", 2});
    assert(g.listarFilaPedidos().size() == 2u);
    assert(g.totalOperacoesHistorico() == 0u);

    // processa proximo pedido (FIFO): pd1 baixa p1 de 10 para 7
    PedidoRequisicao ped = g.processarProximoPedido();
    assert(ped.id == "pd1");
    assert(g.listarFilaPedidos().size() == 1u);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p1") {
            assert(e.quantidade == 7);
        }
    }
    // processa pd2: baixa p2 de 20 para 18
    ped = g.processarProximoPedido();
    assert(ped.id == "pd2");
    assert(g.listarFilaPedidos().empty());
    // fila vazia lança
    bool lancou = false;
    try {
        g.processarProximoPedido();
    } catch (const std::out_of_range&) {
        lancou = true;
    }
    assert(lancou);

    // darBaixaEstoque
    assert(g.darBaixaEstoque("p1", 4) == true);   // 7 -> 3
    assert(g.darBaixaEstoque("p1", 100) == false); // insuficiente
    assert(g.darBaixaEstoque("inexistente", 1) == false);
    assert(g.darBaixaEstoque("p1", 0) == false);

    // reporEstoque
    assert(g.reporEstoque("p1", 5) == true);   // 3 -> 8
    assert(g.reporEstoque("inexistente", 1) == false);
    assert(g.reporEstoque("p1", 0) == false);
    assert(g.totalOperacoesHistorico() == 4u);

    // desfazerUltimaOperacao (LIFO): repor5 -> p1 8->3
    assert(g.desfazerUltimaOperacao() == true);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p1") {
            assert(e.quantidade == 3);
        }
    }
    assert(g.totalOperacoesHistorico() == 3u);

    // desfaz baixa4 -> p1 3->7
    assert(g.desfazerUltimaOperacao() == true);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p1") {
            assert(e.quantidade == 7);
        }
    }
    assert(g.totalOperacoesHistorico() == 2u);

    // desfaz pd2 baixa2 -> p2 18->20
    assert(g.desfazerUltimaOperacao() == true);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p2") {
            assert(e.quantidade == 20);
        }
    }
    assert(g.totalOperacoesHistorico() == 1u);

    // desfaz pd1 baixa3 -> p1 7->10
    assert(g.desfazerUltimaOperacao() == true);
    est = g.listarEstoque();
    for (const auto& e : est) {
        if (e.produtoId == "p1") {
            assert(e.quantidade == 10);
        }
    }
    assert(g.totalOperacoesHistorico() == 0u);

    // sem mais operacoes
    assert(g.desfazerUltimaOperacao() == false);
}

int main() {
    testeListaVazia();
    testeListaAdicaoRemocao();
    testeListaInserirOrdenado();
    testeFilaVazia();
    testeFilaFIFO();
    testePilhaVazia();
    testePilhaLIFO();
    testeGerenciadorEstoque();
    std::cout << "Todos os testes AED passaram com sucesso." << std::endl;
    return 0;
}
