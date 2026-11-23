import { ErroApp } from "../middleware/error";
import prisma from "../lib/prisma";
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

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE fk_usuario_id_usuario = ${usuarioIdNumerico} FOR UPDATE`;
      const carrinho = await tx.carrinho.findUnique({ where: { usuarioId: usuarioIdNumerico } });
      if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

      await tx.$queryRaw`SELECT id_estoque FROM estoque WHERE fk_produto_id_produto = ${produtoIdNumerico} FOR UPDATE`;
      const produto = await tx.produto.findFirst({
        where: { id: produtoIdNumerico, excluido: false },
        include: { estoque: true },
      });
      if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
      if (produto.pausado || produto.statusValidacao !== "APROVADA") {
        throw new ErroApp(409, "Produto indisponível.");
      }

      const existente = await tx.itemCarrinho.findFirst({
        where: { carrinhoId: carrinho.id, produtoId: produto.id },
      });
      const total = (existente?.quantidade ?? 0) + dados.quantidade;
      const estoque = produto.estoque?.quantidadeDisponivel;
      if (estoque === undefined || total > estoque || (produto.pecaUnica && total > 1)) {
        throw new ErroApp(409, "Quantidade acima do estoque disponível.");
      }

      if (carrinho.status !== "ATIVO") {
        await tx.carrinho.update({ where: { id: carrinho.id }, data: { status: "ATIVO" } });
      }
      if (existente) {
        await tx.itemCarrinho.update({
          where: { carrinhoId_numeroItem: { carrinhoId: carrinho.id, numeroItem: existente.numeroItem } },
          data: { quantidade: total },
        });
      } else {
        const ultimo = await tx.itemCarrinho.aggregate({
          where: { carrinhoId: carrinho.id },
          _max: { numeroItem: true },
        });
        await tx.itemCarrinho.create({
          data: {
            carrinhoId: carrinho.id,
            numeroItem: (ultimo._max.numeroItem ?? 0) + 1,
            produtoId: produto.id,
            quantidade: dados.quantidade,
            precoUnitario: produto.preco,
          },
        });
      }
    });

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

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinho.id} AND fk_usuario_id_usuario = ${usuarioIdNumerico} FOR UPDATE`;
      const cartAtual = await tx.carrinho.findFirst({
        where: { id: carrinho.id, usuarioId: usuarioIdNumerico },
      });
      if (!cartAtual) throw new ErroApp(404, "Carrinho nao encontrado.");
      await tx.itemCarrinho.deleteMany({ where: { carrinhoId: cartAtual.id, produtoId: produtoIdNumerico } });
    });

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

    return prisma.$transaction(async (tx) => {
      const carrinho = await tx.carrinho.findUnique({
        where: { usuarioId: usuarioIdNumerico },
        select: { id: true },
      });
      if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

      // Checkout usa o mesmo lock. Assim, alteração da quantidade e compra não
      // podem validar a mesma linha de carrinho em paralelo.
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinho.id} FOR UPDATE`;

      await tx.$queryRaw`SELECT id_estoque FROM estoque WHERE fk_produto_id_produto = ${produtoIdNumerico} FOR UPDATE`;

      const produto = await tx.produto.findFirst({
        where: { id: produtoIdNumerico, excluido: false },
        include: { estoque: true },
      });
      if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
      if (produto.pausado || produto.statusValidacao !== "APROVADA") {
        throw new ErroApp(409, "Produto indisponível.");
      }

      const estoque = produto.estoque?.quantidadeDisponivel;
      if (estoque === undefined || quantidade > estoque || (produto.pecaUnica && quantidade > 1)) {
        throw new ErroApp(409, "Quantidade acima do estoque disponível.");
      }

      const itemExistente = await tx.itemCarrinho.findFirst({
        where: { carrinhoId: carrinho.id, produtoId: produto.id },
      });
      if (!itemExistente) throw new ErroApp(404, "Item nao encontrado no carrinho.");

      await tx.itemCarrinho.update({
        where: { carrinhoId_numeroItem: { carrinhoId: carrinho.id, numeroItem: itemExistente.numeroItem } },
        data: { quantidade },
      });

      const carrinhoAtualizado = await tx.carrinho.findUnique({
        where: { id: carrinho.id },
        include: {
          itens: {
            orderBy: { numeroItem: "asc" },
            include: {
              produto: {
                include: {
                  imagens: { take: 1 },
                  loja: { include: { usuario: { select: { nome: true } } } },
                },
              },
            },
          },
        },
      });
      return { mensagem: "Quantidade atualizada com sucesso.", carrinho: carrinhoAtualizado };
    });
  },
};
