#include "GerenciadorEstoque.hpp"

#include <stdexcept>

namespace aed {

GerenciadorEstoque::GerenciadorEstoque()
    : proximoIdHistorico_(1) {}

bool GerenciadorEstoque::compararPadrao(const ItemEstoque& a,
                                        const ItemEstoque& b) {
    if (a.prioridadeSaida != b.prioridadeSaida) {
        return a.prioridadeSaida < b.prioridadeSaida;
    }
    bool aTem = !a.validade.empty();
    bool bTem = !b.validade.empty();
    if (aTem && bTem) {
        return a.validade < b.validade;
    }
    if (aTem && !bTem) {
        return true;  // com validade sai antes de sem validade
    }
    if (!aTem && bTem) {
        return false;
    }
    return false;  // equivalentes
}

void GerenciadorEstoque::cadastrarProduto(const ItemEstoque& item) {
    bool atualizado = estoque_.modificarPorCriterio(
        [&item](const ItemEstoque& existente) {
            return existente.produtoId == item.produtoId;
        },
        [&item](ItemEstoque& existente) {
            existente.nome = item.nome;
            existente.quantidade = item.quantidade;
            existente.prioridadeSaida = item.prioridadeSaida;
            existente.validade = item.validade;
        });
    if (!atualizado) {
        estoque_.inserirOrdenado(item, compararPadrao);
    }
}

void GerenciadorEstoque::solicitarPedido(const PedidoRequisicao& pedido) {
    pedidos_.enfileirar(pedido);
}

PedidoRequisicao GerenciadorEstoque::processarProximoPedido() {
    if (pedidos_.estaVazia()) {
        throw std::out_of_range("Fila de pedidos vazia");
    }
    PedidoRequisicao pedido = pedidos_.desenfileirar();
    darBaixaEstoque(pedido.produtoId, pedido.quantidade);
    return pedido;
}

bool GerenciadorEstoque::darBaixaEstoque(const std::string& produtoId,
                                         int quantidade) {
    if (quantidade <= 0) {
        return false;
    }
    int anterior = 0;
    bool encontrado = false;
    bool suficiente = true;
    estoque_.modificarPorCriterio(
        [&produtoId](const ItemEstoque& existente) {
            return existente.produtoId == produtoId;
        },
        [&](ItemEstoque& existente) {
            encontrado = true;
            anterior = existente.quantidade;
            if (existente.quantidade < quantidade) {
                suficiente = false;
                return;
            }
            existente.quantidade -= quantidade;
        });
    if (!encontrado || !suficiente) {
        return false;
    }
    registrarOperacao(TipoOperacao::BAIXA, produtoId, quantidade, anterior,
                      anterior - quantidade);
    return true;
}

void GerenciadorEstoque::registrarOperacao(TipoOperacao tipo,
                                           const std::string& produtoId,
                                           int quantidade, int anterior,
                                           int atual) {
    OperacaoHistorico op;
    op.id = std::to_string(proximoIdHistorico_++);
    op.tipo = tipo;
    op.produtoId = produtoId;
    op.quantidade = quantidade;
    op.anterior = anterior;
    op.atual = atual;
    historico_.empilhar(op);
}

bool GerenciadorEstoque::reporEstoque(const std::string& produtoId,
                                      int quantidade) {
    if (quantidade <= 0) {
        return false;
    }
    int anterior = 0;
    bool encontrado = false;
    estoque_.modificarPorCriterio(
        [&produtoId](const ItemEstoque& existente) {
            return existente.produtoId == produtoId;
        },
        [&](ItemEstoque& existente) {
            anterior = existente.quantidade;
            existente.quantidade += quantidade;
            encontrado = true;
        });
    if (!encontrado) {
        return false;
    }
    registrarOperacao(TipoOperacao::REPOSICAO, produtoId, quantidade, anterior,
                      anterior + quantidade);
    return true;
}

bool GerenciadorEstoque::desfazerUltimaOperacao() {
    if (historico_.estaVazia()) {
        return false;
    }
    OperacaoHistorico op = historico_.desempilhar();
    bool ok = estoque_.modificarPorCriterio(
        [&op](const ItemEstoque& existente) {
            return existente.produtoId == op.produtoId;
        },
        [&](ItemEstoque& existente) {
            existente.quantidade = op.anterior;
        });
    return ok;
}

std::vector<ItemEstoque> GerenciadorEstoque::listarEstoque() const {
    return estoque_.paraVetor();
}

std::vector<PedidoRequisicao> GerenciadorEstoque::listarFilaPedidos() const {
    return pedidos_.paraVetor();
}

size_t GerenciadorEstoque::totalOperacoesHistorico() const {
    return historico_.tamanho();
}

}  // namespace aed
