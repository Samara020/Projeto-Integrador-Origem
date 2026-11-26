import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { invalidarSessoesUsuario, prepararControleDeSessao } from "../lib/revogacao-token";
import { MOTIVO_DO_REEMBOLSO, OBSERVACAO_DO_CANCELAMENTO, PEDIDO_NAO_ENVIADO } from "../lib/loja-ativa";
import type { Prisma } from "@prisma/client";

export type AcaoSobreCadastro = "SUSPENDER" | "REATIVAR";
type ResultadoDaAcao =
  | { tipo: "INEXISTENTE" }
  | { tipo: "SEM_MUDANCA" }
  | {
      tipo: "FEITA";
      id: number;
      situacao: string;
      acao: string;
      justificativa: string;
      responsavelId: number;
      realizadaEm: Date;
      efeitos: EfeitosDaSuspensao;
    };

export type EfeitosDaSuspensao = { pedidosCancelados: number; pagamentosReembolsados: number; valorReembolsado: number };

/**
 * Efeito da suspensão sobre os pedidos da loja do artesão (HU-16): pedido que ainda não foi
 * enviado é cancelado inteiro, o estoque de todos os itens volta e o pagamento aprovado
 * passa a REEMBOLSADO. Pedido ENVIADO ou ENTREGUE não é tocado. Roda dentro da transação
 * da suspensão; cada pedido é travado e relido antes de mudar.
 */
async function cancelarPedidosNaoEnviados(tx: Prisma.TransactionClient, usuarioId: number): Promise<EfeitosDaSuspensao> {
  const efeitos: EfeitosDaSuspensao = { pedidosCancelados: 0, pagamentosReembolsados: 0, valorReembolsado: 0 };
  const lojas = await tx.loja.findMany({ where: { usuarioId }, select: { id: true } });
  if (!lojas.length) return efeitos;

  const candidatos = await tx.pedido.findMany({
    where: {
      status: { in: PEDIDO_NAO_ENVIADO },
      itens: { some: { produto: { lojaId: { in: lojas.map((loja) => loja.id) } } } },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const { id } of candidatos) {
    await tx.$queryRaw`SELECT id_pedidos FROM pedido WHERE id_pedidos = ${id} FOR UPDATE`;
    const pedido = await tx.pedido.findUnique({ where: { id }, include: { itens: true, pagamentos: true } });
    // Outra transação pode ter enviado ou cancelado o pedido enquanto esperávamos a trava.
    if (!pedido || !PEDIDO_NAO_ENVIADO.includes(pedido.status)) continue;

    const aprovados = pedido.pagamentos.filter((pagamento) => pagamento.status === "APROVADO");
    await tx.pedido.update({ where: { id }, data: { status: "CANCELADO" } });
    await tx.historicoPedido.create({
      data: {
        pedidoId: id,
        status: "CANCELADO",
        observacao: aprovados.length ? `${OBSERVACAO_DO_CANCELAMENTO} Valor reembolsado.` : OBSERVACAO_DO_CANCELAMENTO,
        data: new Date(),
      },
    });
    for (const item of pedido.itens) {
      await tx.estoque.updateMany({
        where: { produtoId: item.produtoId },
        data: { quantidadeDisponivel: { increment: item.quantidade } },
      });
    }
    for (const pagamento of aprovados) {
      await tx.pagamento.update({ where: { id: pagamento.id }, data: { status: "REEMBOLSADO", motivo: MOTIVO_DO_REEMBOLSO } });
      efeitos.pagamentosReembolsados += 1;
      efeitos.valorReembolsado += Number(pagamento.valor);
    }
    efeitos.pedidosCancelados += 1;
  }
  efeitos.valorReembolsado = Math.round(efeitos.valorReembolsado * 100) / 100;
  return efeitos;
}

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
      // Também não desfaz cancelamento nem reembolso: as peças só voltam à venda.
      let efeitos: EfeitosDaSuspensao = { pedidosCancelados: 0, pagamentosReembolsados: 0, valorReembolsado: 0 };
      if (dados.acao === "SUSPENDER") {
        await invalidarSessoesUsuario(String(alvoId), tx);
        efeitos = await cancelarPedidosNaoEnviados(tx, alvoId);
      }

      return {
        tipo: "FEITA",
        id: alvoId,
        situacao: para,
        acao: registro.acao,
        justificativa: registro.justificativa,
        responsavelId: registro.responsavelId,
        realizadaEm: registro.realizadaEm,
        efeitos,
      };
    }, { timeout: 30000 });
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
