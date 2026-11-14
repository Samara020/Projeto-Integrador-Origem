#ifndef AED_GERENCIADOR_ESTOQUE_HPP
#define AED_GERENCIADOR_ESTOQUE_HPP

#include <cstddef>
#include <string>
#include <vector>

#include "Fila.hpp"
#include "ListaEncadeada.hpp"
#include "Pilha.hpp"

namespace aed {

enum class TipoOperacao {
    BAIXA,
    REPOSICAO
};

struct ItemEstoque {
    std::string id;
    std::string produtoId;
    std::string nome;
    int quantidade;
    int prioridadeSaida;
    std::string validade;  // ISO 8601, vazio = sem validade
};

struct PedidoRequisicao {
    std::string id;
    std::string produtoId;
    int quantidade;
};

struct OperacaoHistorico {
    std::string id;
    TipoOperacao tipo;
    std::string produtoId;
    int quantidade;
    int anterior;
    int atual;
};

class GerenciadorEstoque {
public:
    GerenciadorEstoque();

    void cadastrarProduto(const ItemEstoque& item);

    void solicitarPedido(const PedidoRequisicao& pedido);

    PedidoRequisicao processarProximoPedido();

    bool darBaixaEstoque(const std::string& produtoId, int quantidade);

    bool reporEstoque(const std::string& produtoId, int quantidade);

    bool desfazerUltimaOperacao();

    std::vector<ItemEstoque> listarEstoque() const;

    std::vector<PedidoRequisicao> listarFilaPedidos() const;

    size_t totalOperacoesHistorico() const;

private:
    ListaEncadeada<ItemEstoque> estoque_;
    Fila<PedidoRequisicao> pedidos_;
    Pilha<OperacaoHistorico> historico_;
    size_t proximoIdHistorico_;

    static bool compararPadrao(const ItemEstoque& a, const ItemEstoque& b);

    void registrarOperacao(TipoOperacao tipo, const std::string& produtoId,
                           int quantidade, int anterior, int atual);
};

}  // namespace aed

#endif  // AED_GERENCIADOR_ESTOQUE_HPP
