import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const usuarioRepository = {
  buscarPorEmail(email: string) {
    return prisma.usuario.findUnique({ where: { email } });
  },

  buscarPorId(id: Id) {
    return prisma.usuario.findUnique({ where: { id: toId(id) } });
  },

  /** Lê só a situação (ATIVO | SUSPENSO), sempre do banco, para o login decidir na hora. */
  async buscarSituacao(id: Id) {
    const usuario = await prisma.usuario.findUnique({ where: { id: toId(id) }, select: { situacao: true } });
    return usuario?.situacao ?? null;
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

  atualizarTelefone(id: Id, telefone: string) {
    return prisma.usuario.update({ where: { id: toId(id) }, data: { telefone } });
  },

  atualizarPerfil(id: Id, dados: { nome: string; funcao?: string; telefone?: string }) {
    return prisma.usuario.update({ where: { id: toId(id) }, data: dados });
  },

  buscarComLoja(id: Id) {
    return prisma.usuario.findUnique({
      where: { id: toId(id) },
      include: { loja: { orderBy: { id: "asc" }, take: 1 } },
    });
  },

  buscarPerfilPublicoArtesao(id: Id) {
    return prisma.usuario.findUnique({
      where: { id: toId(id) },
      include: {
        loja: {
          orderBy: { id: "asc" },
          take: 1,
          include: {
            produtos: {
              where: { excluido: false, pausado: false, statusValidacao: "APROVADA" },
              orderBy: { id: "asc" },
              include: {
                imagens: { take: 1 },
                estoque: { select: { quantidadeDisponivel: true } },
                avaliacoes: { select: { nota: true, status: true } },
              },
            },
          },
        },
      },
    });
  },

  contarPorPapel(papel: string) {
    return prisma.usuario.count({ where: { usuarioTipo: papel } });
  },

  contarTodos() {
    return prisma.usuario.count();
  },
};
