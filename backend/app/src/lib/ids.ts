import { ErroApp } from "../middleware/error";

/** O contrato da API usa IDs em texto; o banco usa INTEGER. */
export type Id = string | number;

/** Converte um ID recebido pela API em INTEGER; ID invalido vira 404. */
export const toId = (valor: Id): number => {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isInteger(n) || n <= 0 || n > 2147483647) {
    throw new ErroApp(404, "Recurso nao encontrado.");
  }
  return n;
};
