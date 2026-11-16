import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { validacoes } from "../lib/memoria";

type FiltrosProduto = {
  termo?: string;
  categoria?: string;
  categoriaId?: Id;
  tecnica?: string;
  regiao?: string;
  disponivel?: boolean;
  destaque?: boolean;
  precoMax?: number;
  pecaUnica?: boolean;
  ordenar?: string;
  pagina: number;
  limite: number;
};

const inclusaoPadrao = {
  categoria: true,
  loja: { include: { usuario: { select: { id: true, nome: true } } } },
  estoque: true,
};

export const produtoRepository = {
  listar(filtros: FiltrosProduto) {
    // O SQL nao guarda a validacao: so ficam fora do catalogo os produtos
    // marcados em memoria como PENDENTE ou REPROVADA.
    const naoAprovados = Array.from(validacoes.entries())
      .filter(([, v]) => v.status !== "APROVADA")
      .map(([id]) => id);

    const onde: Record<string, unknown> = {
      excluido: false,
      ...(naoAprovados.length > 0 ? { id: { notIn: naoAprovados } } : {}),
    };

    if (filtros.disponivel) {
      onde.pausado = false;
      onde.estoque = { quantidadeDisponivel: { gt: 0 } };
    }

    if (filtros.termo) {
      onde.nome = { contains: filtros.termo, mode: "insensitive" };
      // Busca de produtos não exibe produtos esgotados/vendidos
      onde.estoque = { quantidadeDisponivel: { gt: 0 } };
    }
    if (filtros.disponivel) {
      onde.estoque = { quantidadeDisponivel: { gt: 0 } };
    }
    if (filtros.destaque) {
      onde.estoque = { quantidadeDisponivel: { gt: 0 } };
    }
    if (filtros.categoria) {
      onde.categoria = { nome: filtros.categoria };
    }
    if (filtros.categoriaId !== undefined) {
      onde.categoriaId = toId(filtros.categoriaId);
    }
    if (filtros.tecnica) {
      onde.tecnica = filtros.tecnica;
    }
    if (filtros.regiao) {
      onde.origem = filtros.regiao;
    }
    if (filtros.precoMax !== undefined) {
      onde.preco = { lte: filtros.precoMax };
    }
    if (filtros.pecaUnica) {
      onde.pecaUnica = true;
    }

    let orderBy: Record<string, "asc" | "desc"> = { id: "desc" };
    if (filtros.ordenar === "menor-preco") {
      orderBy = { preco: "asc" };
    } else if (filtros.ordenar === "maior-preco") {
      orderBy = { preco: "desc" };
    }

    const p = Math.max(filtros.pagina, 1);
    const l = Math.min(Math.max(filtros.limite, 1), 50);

    return prisma.$transaction([
      prisma.produto.count({ where: onde }),
      prisma.produto.findMany({
        where: onde,
        skip: (p - 1) * l,
        take: l,
        orderBy,
        include: { ...inclusaoPadrao, imagens: { take: 1 } },
      }),
    ]);
  },

  buscarPorId(id: Id) {
    return prisma.produto.findFirst({
      where: { id: toId(id), excluido: false },
      include: { ...inclusaoPadrao, imagens: true },
    });
  },

  criar(dados: {
    nome: string;
    descricao?: string | null;
    tecnica: string;
    preco: number;
    origem: string;
    modalidadeProducao: string;
    pecaUnica: boolean;
    lojaId: Id;
    categoriaId: Id;
    imagens: string[];
    estoque: number;
    pontoReposicao?: number;
  }) {
    return prisma.produto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao ?? null,
        tecnica: dados.tecnica,
        preco: dados.preco,
        origem: dados.origem,
        modalidadeProducao: dados.modalidadeProducao,
        pecaUnica: dados.pecaUnica,
        lojaId: toId(dados.lojaId),
        categoriaId: toId(dados.categoriaId),
        imagens: dados.imagens.length
          ? { create: dados.imagens.map((url) => ({ url })) }
          : undefined,
        estoque: {
          create: {
            quantidadeDisponivel: dados.estoque,
            pontoReposicao: dados.pontoReposicao ?? 0,
          },
        },
      },
      include: { imagens: true },
    });
  },

  atualizar(
    id: Id,
    dados: {
      nome?: string;
      descricao?: string | null;
      tecnica?: string;
      preco?: number;
      origem?: string;
      modalidadeProducao?: string;
      pecaUnica?: boolean;
    }
  ) {
    return prisma.produto.update({ where: { id: toId(id) }, data: dados });
  },

  /** Inativar = zerar o estoque (o SQL nao tem coluna de situacao). */
  inativar(id: Id) {
    return this.atualizarEstoque(id, 0);
  },

  contarItensPedido(id: Id) {
    return prisma.itemPedido.count({
      where: { produtoId: toId(id) },
    });
  },

  async excluirFisicamente(id: Id) {
    const produtoId = toId(id);
    return prisma.$transaction(async (tx) => {
      await tx.itemCarrinho.deleteMany({ where: { produtoId } });
      await tx.avaliacao.deleteMany({ where: { produtoId } });
      await tx.imagem.deleteMany({ where: { produtoId } });
      await tx.estoque.deleteMany({ where: { produtoId } });
      return tx.produto.delete({ where: { id: produtoId } });
    });
  },

  listarPorLoja(lojaId: Id, filtros: { situacao?: string }) {
    const onde: Record<string, unknown> = {
      lojaId: toId(lojaId),
      excluido: false,
    };
    if (filtros.situacao === "ESTOQUE_BAIXO") {
      onde.estoque = { is: { quantidadeDisponivel: { lt: 5 } } };
    }
    return prisma.produto.findMany({
      where: onde,
      orderBy: { id: "asc" },
      include: { imagens: { take: 1 }, estoque: true },
    });
  },

  atualizarPausa(id: Id, pausado: boolean) {
    return prisma.produto.update({
      where: { id: toId(id) },
      data: { pausado },
    });
  },

  atualizarEstoqueEPausa(id: Id, dados: { estoque?: number; pausado?: boolean }) {
    const produtoId = toId(id);
    const updates: any[] = [];
    if (dados.pausado !== undefined) {
      updates.push(
        prisma.produto.update({
          where: { id: produtoId },
          data: { pausado: dados.pausado },
        })
      );
    }
    if (dados.estoque !== undefined) {
      updates.push(
        prisma.estoque.upsert({
          where: { produtoId },
          update: { quantidadeDisponivel: dados.estoque },
          create: { produtoId, quantidadeDisponivel: dados.estoque, pontoReposicao: 0 },
        })
      );
    }
    if (updates.length === 0) return Promise.resolve([]);
    return prisma.$transaction(updates);
  },

  inativarLogicamente(id: Id) {
    const produtoId = toId(id);
    return prisma.$transaction([
      prisma.produto.update({
        where: { id: produtoId },
        data: { excluido: true, pausado: false },
      }),
      this.atualizarEstoque(produtoId, 0),
    ]);
  },

  atualizarEstoque(id: Id, quantidade: number) {
    const produtoId = toId(id);
    return prisma.estoque.upsert({
      where: { produtoId },
      update: { quantidadeDisponivel: quantidade },
      create: { produtoId, quantidadeDisponivel: quantidade, pontoReposicao: 0 },
    });
  },

  catalogoParaRecomendacao() {
    return prisma.produto.findMany({
      where: { excluido: false, pausado: false },
      orderBy: { id: "asc" },
      include: { ...inclusaoPadrao, imagens: { take: 1 } },
    });
  },

  listarTodos() {
    return prisma.produto.findMany({
      where: { excluido: false },
      orderBy: { id: "desc" },
      include: {
        loja: { include: { usuario: { select: { id: true, nome: true } } } },
        imagens: { take: 1 },
      },
    });
  },

  comparar(ids: Id[]) {
    return prisma.produto.findMany({
      where: { id: { in: ids.map(toId) } },
      select: { id: true, nome: true, preco: true, tecnica: true },
    });
  },
};
