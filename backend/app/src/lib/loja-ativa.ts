// Regras da suspensão de cadastro de artesão (HU-16), num lugar só.

/**
 * Filtro Prisma para `produto`: a peça só está à venda se o dono da loja não estiver
 * suspenso. Entra em toda consulta pública de peça (catálogo, detalhe, recomendação,
 * personalização) junto de excluido, pausado e statusValidacao.
 */
export const DE_LOJA_ATIVA = { loja: { usuario: { situacao: "ATIVO" } } };

/**
 * Situações de pedido em que a peça ainda não saiu do artesão. Ao suspender a conta dele,
 * esses pedidos são cancelados e o que foi pago é reembolsado. Pedido já ENVIADO ou
 * ENTREGUE segue o caminho normal.
 */
export const PEDIDO_NAO_ENVIADO = ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_PRODUCAO"];

export const OBSERVACAO_DO_CANCELAMENTO = "Cancelado pela suspensão da loja de uma das peças.";
export const MOTIVO_DO_REEMBOLSO = "Reembolso: pedido cancelado pela suspensão da loja antes do envio.";
