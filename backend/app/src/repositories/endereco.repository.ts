import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const enderecoRepository = {
  /** O SQL nao liga endereco a usuario; usa-se o do pedido mais recente. */
  buscarPorUsuarioId(usuarioId: Id) {
    return prisma.enderecoEntrega.findFirst({
      where: { pedidos: { some: { usuarioId: toId(usuarioId) } } },
      orderBy: { id: "desc" },
    });
  },

  criar(dados: { logradouro: string; bairro: string; cidade: string; cpf: string }) {
    return prisma.enderecoEntrega.create({ data: dados });
  },
};
