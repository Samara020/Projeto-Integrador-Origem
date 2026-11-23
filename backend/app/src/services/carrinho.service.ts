import { ErroApp } from "../middleware/error";
import { carrinhoRepository } from "../repositories";

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
    const usuarioIdNumerico = Number(usuarioId);
    const produtoIdNumerico = Number(dados.produtoId);
    if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) {
      throw new ErroApp(400, "A quantidade deve ser um número inteiro maior que zero.");
    }
    if (!Number.isInteger(usuarioIdNumerico) || !Number.isInteger(produtoIdNumerico) || usuarioIdNumerico < 1 || produtoIdNumerico < 1) {
      throw new ErroApp(404, "Carrinho ou produto nao encontrado.");
    }

    const carrinhoInicial = await carrinhoRepository.buscarPorUsuarioId(usuarioIdNumerico);
    if (!carrinhoInicial) {
      try {
        await carrinhoRepository.criar(usuarioIdNumerico);
      } catch (erro) {
        if ((erro as { code?: string })?.code !== "P2002") throw erro;
      }
    }

    await carrinhoRepository.adicionarItemComTrava(usuarioIdNumerico, produtoIdNumerico, dados.quantidade);
    return { mensagem: "Item adicionado ao carrinho com sucesso." };
  },

  async removerItem(usuarioId: string, produtoId: string) {
    const usuarioIdNumerico = Number(usuarioId);
    const produtoIdNumerico = Number(produtoId);
    if (!Number.isInteger(usuarioIdNumerico) || !Number.isInteger(produtoIdNumerico) || usuarioIdNumerico < 1 || produtoIdNumerico < 1) {
      throw new ErroApp(404, "Carrinho ou produto nao encontrado.");
    }
    const carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioIdNumerico);
    if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

    await carrinhoRepository.removerItemComTrava(carrinho.id, usuarioIdNumerico, produtoIdNumerico);
    return { mensagem: "Item removido do carrinho." };
  },

  async atualizarQuantidadeAbsoluta(usuarioId: string, produtoId: string, quantidade: number) {
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new ErroApp(400, "A quantidade deve ser um número inteiro maior que zero.");
    }
    const usuarioIdNumerico = Number(usuarioId);
    const produtoIdNumerico = Number(produtoId);
    if (!Number.isInteger(usuarioIdNumerico) || !Number.isInteger(produtoIdNumerico) || usuarioIdNumerico < 1 || produtoIdNumerico < 1) {
      throw new ErroApp(404, "Carrinho ou produto nao encontrado.");
    }

    return carrinhoRepository.atualizarQuantidadeComTrava(usuarioIdNumerico, produtoIdNumerico, quantidade);
  },
};
