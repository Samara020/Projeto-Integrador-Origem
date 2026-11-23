import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const adminRepository = {
  async listarMetricasAdmin() {
    const [
      usuarios,
      artesaoCount,
      produtos,
      pagamentos,
      tickets,
      validacoesPendentes,
      denunciasPendentes,
    ] = await Promise.all([
      prisma.usuario.findMany({
        select: { id: true, nome: true, usuarioTipo: true },
        orderBy: { id: "desc" },
      }),
      prisma.usuario.count({ where: { usuarioTipo: "ARTESAO" } }),
      prisma.produto.count({ where: { excluido: false } }),
      prisma.pagamento.aggregate({
        where: { status: "APROVADO" },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.ticket.findMany({
        where: { status: { not: "RESOLVIDO" } },
        select: { prioridade: true },
      }),
      prisma.produto.count({
        where: { excluido: false, statusValidacao: "PENDENTE" },
      }),
      prisma.avaliacao.count({ where: { status: "EM_MODERACAO" } }),
    ]);

    return {
      usuarios,
      artesaoCount,
      produtos,
      pagamentos,
      tickets,
      validacoesPendentes,
      denunciasPendentes,
    };
  },

  /** O SQL nao tem tabela de perfil de admin: usa o primeiro usuario ADMINISTRADOR. */
  buscarPerfil() {
    return prisma.usuario.findFirst({
      where: { usuarioTipo: "ADMINISTRADOR" },
      orderBy: { id: "asc" },
    });
  },

  async listarMetricasArtesao(lojaId: Id) {
    const id = toId(lojaId);
    const [produtos, pedidos, notas] = await Promise.all([
      prisma.produto.findMany({
        where: { lojaId: id, excluido: false },
        include: { estoque: true },
      }),
      prisma.pedido.findMany({
        where: { itens: { some: { produto: { lojaId: id } } } },
        orderBy: { data: "desc" },
        include: {
          usuario: { select: { nome: true } },
          itens: { where: { produto: { lojaId: id } }, include: { produto: true } },
        },
      }),
      prisma.avaliacao.findMany({
        where: { produto: { lojaId: id }, status: "PUBLICADO" },
        orderBy: { dataAvaliacao: "desc" },
        include: {
          usuario: { select: { nome: true } },
          produto: { select: { nome: true } },
        },
      }),
    ]);
    return { produtos, pedidos, notas };
  },
};
