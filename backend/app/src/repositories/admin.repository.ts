import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { invalidarSessoesUsuario, prepararControleDeSessao } from "../lib/revogacao-token";

export type AcaoSobreCadastro = "SUSPENDER" | "REATIVAR";
type ResultadoDaAcao =
  | { tipo: "INEXISTENTE" }
  | { tipo: "SEM_MUDANCA" }
  | { tipo: "FEITA"; id: number; situacao: string; acao: string; justificativa: string; responsavelId: number; realizadaEm: Date };

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
        select: { id: true, nome: true, usuarioTipo: true, situacao: true },
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

  /**
   * Suspende ou reativa um cadastro. Situação, linha de auditoria e derrubada das sessões
   * abertas vão numa transação só: ou tudo vale, ou nada. O updateMany condicionado à
   * situação anterior faz duas ações iguais e simultâneas terminarem com uma só registrada.
   */
  async mudarSituacaoDoUsuario(dados: {
    alvoId: Id;
    responsavelId: Id;
    acao: AcaoSobreCadastro;
    justificativa: string;
  }): Promise<ResultadoDaAcao> {
    const alvoId = toId(dados.alvoId);
    const responsavelId = toId(dados.responsavelId);
    const [de, para] = dados.acao === "SUSPENDER" ? ["ATIVO", "SUSPENSO"] : ["SUSPENSO", "ATIVO"];

    await prepararControleDeSessao();
    return prisma.$transaction(async (tx) => {
      const alvo = await tx.usuario.findUnique({ where: { id: alvoId }, select: { id: true } });
      if (!alvo) return { tipo: "INEXISTENTE" };

      const { count } = await tx.usuario.updateMany({
        where: { id: alvoId, situacao: de },
        data: { situacao: para },
      });
      if (count === 0) return { tipo: "SEM_MUDANCA" };

      const registro = await tx.acaoAdministrativaUsuario.create({
        data: { alvoId, responsavelId, acao: dados.acao, justificativa: dados.justificativa, situacaoResultante: para },
      });
      // Reativar não precisa derrubar nada: os tokens antigos já caíram na suspensão.
      if (dados.acao === "SUSPENDER") await invalidarSessoesUsuario(String(alvoId), tx);

      return {
        tipo: "FEITA",
        id: alvoId,
        situacao: para,
        acao: registro.acao,
        justificativa: registro.justificativa,
        responsavelId: registro.responsavelId,
        realizadaEm: registro.realizadaEm,
      };
    });
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
