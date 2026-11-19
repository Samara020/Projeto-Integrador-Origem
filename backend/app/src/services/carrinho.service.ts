import { ErroApp } from "../middleware/error";
import { carrinhoRepository, produtoRepository } from "../repositories";

export const carrinhoService = {
  async obter(usuarioId: string) {
    let carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    if (!carrinho) {
      await carrinhoRepository.criar(usuarioId);
      carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    }

    if (!carrinho) throw new ErroApp(500, "Não foi possível criar o carrinho.");

    const itens = carrinho.itens.map((item: any) => ({
      produtoId: item.produto.id,
      quantidade: item.quantidade,
      precoUnitario: Number(item.produto.preco),
      nome: item.produto.nome,
      imagemPrincipal: item.produto.imagens[0]?.url ?? "",
    }));
    const valorTotal = itens.reduce((s: number, i: any) => s + i.precoUnitario * i.quantidade, 0);

    return { itens, valorTotal };
  },

  async adicionar(usuarioId: string, dados: { produtoId: string; quantidade: number }) {
    const produto = await produtoRepository.buscarPorId(dados.produtoId);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
    if (produto.pausado || produto.statusValidacao !== "APROVADA" || !Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
      throw new ErroApp(409, "Produto indisponível ou quantidade inválida.");
    }

    let carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    if (!carrinho) {
      await carrinhoRepository.criar(usuarioId);
      carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    }

    if (!carrinho) throw new ErroApp(500, "Não foi possível criar o carrinho.");

    if (carrinho.status !== "ATIVO") {
      await carrinhoRepository.atualizarStatus(carrinho.id, "ATIVO");
    }

    const existente = await carrinhoRepository.buscarItem(carrinho.id, dados.produtoId);
    const total = (existente?.quantidade ?? 0) + dados.quantidade;
    if (total > (produto.estoque?.quantidadeDisponivel ?? 0) || (produto.pecaUnica && total > 1)) {
      throw new ErroApp(409, "Quantidade acima do estoque disponível.");
    }

    if (existente) {
      await carrinhoRepository.atualizarItem(carrinho.id, existente.numeroItem, existente.quantidade + dados.quantidade);
    } else {
      await carrinhoRepository.criarItem({
        carrinhoId: carrinho.id,
        produtoId: dados.produtoId,
        quantidade: dados.quantidade,
        precoUnitario: produto.preco,
      });
    }

    return { mensagem: "Item adicionado ao carrinho com sucesso." };
  },

  async removerItem(usuarioId: string, produtoId: string) {
    const carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

    await carrinhoRepository.removerItens(carrinho.id, produtoId);

    return { mensagem: "Item removido do carrinho." };
  },
};
