import { NextFunction, Request, Response } from "express";

export class ErroApp extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroApp";
    this.status = status;
  }
}

export const tratarErro = (
  erro: ErroApp | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ mensagem: erro.message });
  }

  console.error(erro);
  return res.status(500).json({ mensagem: "Erro interno do servidor." });
};
