import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

type FiltrosProduto = {
  termo?: string;
  categoria?: string;
  categoriaId?: Id;
  tecnica?: string;
  regiao?: string;
  origem?: string;
  avaliacaoMin?: number;
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
  avaliacoes: { select: { nota: true, status: true } },
};

const mediaDe = (notas: { nota: number; status?: string }[]): number => {
  const validas = notas.filter((n) => (n.status ?? "PUBLICADO") === "PUBLICADO");
  if (!validas.length) return 0;
  return Math.round((validas.reduce((s, n) => s + n.nota, 0) / validas.length) * 10) / 10;
};

export const produtoRepository = {
  async listar(filtros: FiltrosProduto): Promise<[number, any[]]> {
    const onde: Record<string, unknown> = {
      excluido: false,
      pausado: false,
      statusValidacao: "APROVADA",
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
    if (filtros.destaque) {
      onde.estoque = { quantidadeDisponivel: { gt: 0 } };
    }
    if (filtros.categoria) {
      if (/^\d+$/.test(String(filtros.categoria))) {
        onde.categoriaId = toId(filtros.categoria);
      } else {
        onde.categoria = { nome: { equals: filtros.categoria, mode: "insensitive" } };
      }
    }
    if (filtros.categoriaId !== undefined) {
      onde.categoriaId = toId(filtros.categoriaId);
    }
    if (filtros.tecnica) {
      onde.tecnica = filtros.tecnica;
    }
    const regiao = filtros.regiao ?? filtros.origem;
    if (regiao) {
      onde.origem = { contains: regiao, mode: "insensitive" };
    }
    if (filtros.precoMax !== undefined) {
      onde.preco = { lte: filtros.precoMax };
    }
    if (filtros.pecaUnica) {
      onde.pecaUnica = true;
    }

    const produtos = await prisma.produto.findMany({
      where: onde,
      include: { ...inclusaoPadrao, imagens: { take: 1 } },
    });

    let filtrados = produtos.map((produto) => ({
      produto,
      media: mediaDe(produto.avaliacoes),
    }));

    if (filtros.avaliacaoMin !== undefined && Number.isFinite(filtros.avaliacaoMin)) {
      const minimo = Math.min(Math.max(filtros.avaliacaoMin, 0), 5);
      filtrados = filtrados.filter((item) => item.media >= minimo);
    }

    if (filtros.ordenar === "menor-preco") {
      filtrados.sort((a, b) => Number(a.produto.preco) - Number(b.produto.preco));
    } else if (filtros.ordenar === "maior-preco") {
      filtrados.sort((a, b) => Number(b.produto.preco) - Number(a.produto.preco));
    } else if (filtros.ordenar === "melhor-avaliacao") {
      filtrados.sort((a, b) => b.media - a.media || b.produto.id - a.produto.id);
    } else {
      filtrados.sort((a, b) => b.produto.id - a.produto.id);
    }

    const p = Math.max(filtros.pagina, 1);
    const l = Math.min(Math.max(filtros.limite, 1), 50);
    const inicio = (p - 1) * l;

    return [
      filtrados.length,
      filtrados.slice(inicio, inicio + l).map((item) => ({
        ...item.produto,
        avaliacaoMedia: item.media,
      })),
    ];
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
        statusValidacao: "PENDENTE",
        seloAtivo: false,
        enviadoEm: new Date(),
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

  atualizarValidacao(
    id: Id,
    dados: {
      statusValidacao: "APROVADA" | "REPROVADA";
      seloAtivo: boolean;
      justificativa: string | null;
      decididoEm: Date;
      decididoPorId: number;
    }
  ) {
    return prisma.produto.updateMany({
      where: { id: toId(id), statusValidacao: "PENDENTE" },
      data: {
        statusValidacao: dados.statusValidacao,
        seloAtivo: dados.seloAtivo,
        justificativaValidacao: dados.justificativa,
        decididoEm: dados.decididoEm,
        decididoPorId: dados.decididoPorId,
      },
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
