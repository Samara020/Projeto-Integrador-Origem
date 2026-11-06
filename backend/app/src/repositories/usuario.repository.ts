import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const usuarioRepository = {
  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  buscarPorId(id: Id) {
    return prisma.usuario.findUnique({ where: { id: toId(id) } });
  },

  criar(dados: {
    nome: string;
    email: string;
    senha: string;
    papel: string;
    telefone?: string | null;
  }) {
    return prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        usuarioTipo: dados.papel,
        telefone: dados.telefone ?? null,
      },
    });
  },

  atualizarSenha(id: Id, senha: string) {
    return prisma.usuario.update({ where: { id: toId(id) }, data: { senha } });
  },

  contarPorPapel(papel: string) {
    return prisma.usuario.count({ where: { usuarioTipo: papel } });
  },

  contarTodos() {
    return prisma.usuario.count();
  },
};
