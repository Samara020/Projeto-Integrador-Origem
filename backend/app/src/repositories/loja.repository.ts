import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

type DadosLoja = {
  nome?: string;
  descricao?: string | null;
  regiao?: string | null;
  foto?: string | null;
  fotoCapa?: string | null;
  redesSociais?: string | null;
  tecnicas?: string[];
  certificacoes?: string[];
  dadosBancarios?: string | null;
};

export const lojaRepository = {
  buscarPorUsuarioId(usuarioId: Id) {
    return prisma.loja.findFirst({
      where: { usuarioId: toId(usuarioId) },
      orderBy: { id: "asc" },
    });
  },

  buscarPorId(id: Id) {
    return prisma.loja.findUnique({ where: { id: toId(id) } });
  },

  criar(dados: { nome: string; usuarioId: Id } & DadosLoja) {
    const { nome, usuarioId, tecnicas, certificacoes, ...resto } = dados;
    return prisma.loja.create({
      data: {
        nome,
        usuarioId: toId(usuarioId),
        ...resto,
        tecnicas: tecnicas ?? [],
        certificacoes: certificacoes ?? [],
      },
    });
  },

  atualizar(id: Id, dados: DadosLoja) {
    return prisma.loja.update({ where: { id: toId(id) }, data: dados });
  },

  atualizarConfiguracaoEnvio(id: Id, configuracaoEnvio: any) {
    return prisma.loja.update({
      where: { id: toId(id) },
      data: { configuracaoEnvio },
    });
  },

  listarAvaliacoesDeProdutos(produtoIds: number[]) {
    if (!produtoIds.length) return Promise.resolve([]);
    return prisma.avaliacao.findMany({
      where: { produtoId: { in: produtoIds } },
      select: { nota: true, status: true },
    });
  },

  async somarItensVendidos(produtoIds: number[]) {
    if (!produtoIds.length) return 0;
    const resultado = await prisma.itemPedido.aggregate({
      where: {
        produtoId: { in: produtoIds },
        pedido: { status: { in: ["PAGO", "ENVIADO", "ENTREGUE"] } },
      },
      _sum: { quantidade: true },
    });
    return resultado._sum.quantidade ?? 0;
  },

  listarProdutos(lojaId: Id) {
    return prisma.produto.findMany({ where: { lojaId: toId(lojaId) } });
  },
};
