import { createHash, randomBytes } from "crypto";
import prisma from "../lib/prisma";
import { ErroApp } from "../middleware/error";

const VALIDADE_MS = 60 * 60 * 1000;

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const recuperacaoRepository = {
  async criar(usuarioId: number) {
    const token = randomBytes(32).toString("hex");
    const expiraEm = new Date(Date.now() + VALIDADE_MS);

    // Um pedido novo invalida os anteriores ainda não usados.
    await prisma.recuperacaoSenha.updateMany({
      where: { usuarioId, usadoEm: null },
      data: { usadoEm: new Date() },
    });

    await prisma.recuperacaoSenha.create({
      data: { usuarioId, tokenHash: hashToken(token), expiraEm },
    });

    return { token, expiraEm };
  },

  buscarValido(token: string) {
    return prisma.recuperacaoSenha.findFirst({
      where: {
        tokenHash: hashToken(token),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
      include: { usuario: true },
      orderBy: { id: "desc" },
    });
  },

  marcarUsado(id: number) {
    return prisma.recuperacaoSenha.update({
      where: { id },
      data: { usadoEm: new Date() },
    });
  },

  async consumir(token: string, senha: string) {
    return prisma.$transaction(async (tx) => {
      const agora = new Date();
      const registro = await tx.recuperacaoSenha.findUnique({ where: { tokenHash: hashToken(token) } });
      if (!registro) throw new ErroApp(400, "Token de recuperação inválido ou expirado.");
      const consumo = await tx.recuperacaoSenha.updateMany({
        where: { id: registro.id, usadoEm: null, expiraEm: { gt: agora } },
        data: { usadoEm: agora },
      });
      if (consumo.count !== 1) throw new ErroApp(400, "Token de recuperação inválido ou expirado.");
      await tx.usuario.update({ where: { id: registro.usuarioId }, data: { senha } });
    });
  },
};
