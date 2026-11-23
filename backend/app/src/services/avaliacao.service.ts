import { ErroApp } from "../middleware/error";
import prisma from "../lib/prisma";
import { toId } from "../lib/ids";
import { avaliacaoRepository, produtoRepository } from "../repositories";

export const avaliacaoService = {
  async criar(dados: {
    usuarioId: string;
    produtoId: string;
    pedidoId?: string;
    nota: number;
    comentario?: string | null;
  }) {
    const produto = await produtoRepository.buscarPorId(dados.produtoId);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const pedido = await prisma.pedido.findFirst({ where: {
      id: dados.pedidoId ? toId(dados.pedidoId) : -1, usuarioId: toId(dados.usuarioId),
      status: { in: ["PAGO", "EM_PRODUCAO", "PRONTO", "ENVIADO", "ENTREGUE"] },
      itens: { some: { produtoId: produto.id } },
    } });
    if (!pedido) throw new ErroApp(403, "Avalie somente peças de uma compra confirmada sua.");
    const suspeita = /https?:\/\/|whatsapp|zap|\bpix\b|telefone/i.test(dados.comentario ?? "");
    const avaliacao = await avaliacaoRepository.criar({ ...dados,
      status: suspeita ? "EM_MODERACAO" : "PUBLICADO", motivo: suspeita ? "LINK_OU_CONTATO" : null,
    });

    return {
      id: avaliacao.id,
      status: avaliacao.status,
    };
  },

  async listarPorProduto(produtoId: string) {
    const avaliacoes = await avaliacaoRepository.listarPorProduto(produtoId);
    const media =
      avaliacoes.length > 0
        ? avaliacoes.reduce((s: number, a: any) => s + a.nota, 0) / avaliacoes.length
        : 0;

    // O SQL nao guarda "compra verificada": calcula pelo historico de pedidos.
    const compras = new Map<number, boolean>();
    for (const a of avaliacoes) {
      if (compras.has(a.usuarioId)) continue;
      const pedido = await avaliacaoRepository.buscarPedidoDoProduto(a.usuarioId, a.produtoId);
      compras.set(a.usuarioId, pedido !== null);
    }

    return {
      media: Math.round(media * 10) / 10,
      total: avaliacoes.length,
      itens: avaliacoes.map((a: any) => ({
        id: a.id,
        produtoId: a.produtoId,
        autor: a.usuario.nome,
        nota: a.nota,
        comentario: a.comentario ?? "",
        criadoEm: a.dataAvaliacao,
        compraVerificada: compras.get(a.usuarioId) ?? false,
      })),
    };
  },

  async listarPorArtesao(usuarioId: string) {
    const { lojaRepository } = await import("../repositories/loja.repository");
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return { mediaNotas: 0, avaliacoes: [] };
    }

    const avaliacoes = await avaliacaoRepository.listarPorLoja(loja.id);
    const media =
      avaliacoes.length > 0
        ? avaliacoes.reduce((s: number, a: any) => s + a.nota, 0) / avaliacoes.length
        : 0;

    return {
      mediaNotas: Math.round(media * 10) / 10,
      avaliacoes: avaliacoes.map((a: any) => ({
        id: a.id,
        nota: a.nota,
        comentario: a.comentario ?? "",
      })),
    };
  },

  async listarParaModeracao(filtros: { status?: string }) {
    const itens = await avaliacaoRepository.listarParaModeracao(filtros);
    return {
      total: itens.length,
      itens: itens.map((a: any) => ({
        id: a.id,
        produto: { id: a.produto.id, nome: a.produto.nome, imagemPrincipal: a.produto.imagens[0]?.url ?? "" },
        autor: a.usuario.nome,
        nota: a.nota,
        comentario: a.comentario ?? "",
        criadoEm: a.dataAvaliacao,
        motivo: a.motivo,
        sinalizadaEm: a.sinalizadaEm,
        status: a.status,
        moderadaEm: a.moderadaEm,
      })),
    };
  },

  async moderar(id: string, acao: "REMOVER" | "MANTER") {
    const avaliacao = await avaliacaoRepository.buscarPorId(id);
    if (!avaliacao) throw new ErroApp(404, "Avaliacao nao encontrada.");

    const status = acao === "REMOVER" ? "REMOVIDO" : "PUBLICADO";
    await avaliacaoRepository.moderar(id, status);

    return { id: avaliacao.id, status };
  },

  async listarPorComprador(usuarioId: string) {
    const avaliacoes = await avaliacaoRepository.listarPorComprador(usuarioId);
    const pedidos = await Promise.all(
      avaliacoes.map((a: any) => avaliacaoRepository.buscarPedidoDoProduto(a.usuarioId, a.produtoId))
    );

    return avaliacoes.map((a: any, i: number) => ({
      id: a.id,
      pedidoId: pedidos[i]?.id ?? null,
      produtoId: a.produtoId,
      nota: a.nota,
      comentario: a.comentario ?? "",
      criadoEm: a.dataAvaliacao,
      nomeProduto: a.produto.nome,
      imagemPrincipal: a.produto.imagens[0]?.url ?? "",
    }));
  },
};
