import { NextFunction, Request, Response } from "express";

const ehChaveDeId = (chave: string) => chave === "id" || chave.endsWith("Id");

const converter = (valor: unknown, chave?: string): unknown => {
  if (typeof valor === "number" && chave && ehChaveDeId(chave)) return String(valor);
  if (Array.isArray(valor)) return valor.map((v) => converter(v, chave));
  if (valor && typeof valor === "object" && typeof (valor as any).toJSON !== "function") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, converter(v, k)])
    );
  }
  return valor;
};

/** Mantem o contrato da API: todo `id` e `*Id` sai como string. */
export const idsComoTexto = (_req: Request, res: Response, next: NextFunction) => {
  const json = res.json.bind(res);
  res.json = (corpo?: unknown) => json(converter(corpo));
  next();
};
