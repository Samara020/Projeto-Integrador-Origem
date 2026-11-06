/**
 * Estado que o esquema SQL (database/sql) nao persiste.
 * Vive apenas na memoria do processo e e perdido ao reiniciar a API.
 */

export type StatusValidacao = "PENDENTE" | "APROVADA" | "REPROVADA";

export type DecisaoValidacao = {
  status: StatusValidacao;
  seloAtivo: boolean;
  justificativa: string | null;
  decididoEm: Date | null;
};

/** Validacao de curadoria por produto. Produto ausente = APROVADA. */
export const validacoes = new Map<number, DecisaoValidacao>();

export const statusValidacaoDe = (produtoId: number): StatusValidacao =>
  validacoes.get(produtoId)?.status ?? "APROVADA";

export const seloAtivoDe = (produtoId: number): boolean =>
  validacoes.get(produtoId)?.seloAtivo ?? false;

/** Avaliacoes removidas pela moderacao. */
export const avaliacoesRemovidas = new Set<number>();
