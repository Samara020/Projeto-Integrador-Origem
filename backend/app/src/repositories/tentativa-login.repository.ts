import prisma from "../lib/prisma";

export const tentativaLoginRepository = {
  buscar(email: string) {
    return prisma.tentativaLogin.findUnique({ where: { email } });
  },

  async registrarFalha(email: string, maxTentativas: number, minutosBloqueio: number) {
    const agora = new Date();
    return prisma.$transaction(async (tx) => {
      const atual = await tx.tentativaLogin.findUnique({ where: { email } });
      const bloqueioExpirado = atual?.bloqueadoAte != null && atual.bloqueadoAte <= agora;
      const novasTentativas = bloqueioExpirado ? 1 : (atual?.tentativas ?? 0) + 1;
      const bloqueadoAte =
        novasTentativas >= maxTentativas
          ? new Date(agora.getTime() + minutosBloqueio * 60 * 1000)
          : null;

      return tx.tentativaLogin.upsert({
        where: { email },
        create: {
          email,
          tentativas: novasTentativas,
          bloqueadoAte,
          atualizadoEm: agora,
        },
        update: {
          tentativas: novasTentativas,
          bloqueadoAte,
          atualizadoEm: agora,
        },
      });
    });
  },

  limpar(email: string) {
    return prisma.tentativaLogin.deleteMany({ where: { email } });
  },
};
