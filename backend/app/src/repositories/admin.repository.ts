import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const adminRepository = {
  async listarMetricasAdmin() {
    const [totalUsuarios, totalArtesaos] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { usuarioTipo: "ARTESAO" } }),
    ]);
    return { totalUsuarios, totalArtesaos };
  },

  /** O SQL nao tem tabela de perfil de admin: usa o primeiro usuario ADMINISTRADOR. */
  buscarPerfil() {
    return prisma.usuario.findFirst({
      where: { usuarioTipo: "ADMINISTRADOR" },
      orderBy: { id: "asc" },
    });
  },

  async listarMetricasArtesao(lojaId: Id) {
    const produtos = await prisma.produto.findMany({ where: { lojaId: toId(lojaId) } });
    const produtoIds = produtos.map((p) => p.id);
    const pedidos = await prisma.pedido.findMany({
      where: { itens: { some: { produtoId: { in: produtoIds } } } },
      include: {
        itens: { include: { produto: true } },
        usuario: { select: { nome: true } },
      },
    });
    return { produtos, pedidos };
  },
};
