import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ErroApp extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ErroApp";
    this.status = status;
  }
}

/** Formato padrao de erro: `{ mensagem }`, com `erros` (campo + mensagem) quando for validacao. */
export interface CorpoErro {
  mensagem: string;
  erros?: { campo: string; mensagem: string }[];
}

/** Rota inexistente: responde 404 no mesmo formato dos demais erros. */
export const rotaNaoEncontrada = (_req: Request, _res: Response, next: NextFunction) =>
  next(new ErroApp(404, "Rota nao encontrada."));

export const tratarErro = (
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ mensagem: erro.message } satisfies CorpoErro);
  }

  if (erro instanceof ZodError) {
    const erros = erro.issues.map((i) => ({
      campo: i.path.join("."),
      mensagem: i.message,
    }));

    const primeiraMensagem = erros[0]?.mensagem;
    const ehMensagemAmigavel =
      primeiraMensagem &&
      !primeiraMensagem.startsWith("Required") &&
      !primeiraMensagem.startsWith("Expected");

    const mensagem = ehMensagemAmigavel
      ? primeiraMensagem
      : erros[0]?.campo
      ? `Dados invalidos: campo '${erros[0].campo}' obrigatorio ou com formato invalido.`
      : "Dados invalidos.";

    return res.status(400).json({ mensagem, erros } satisfies CorpoErro);
  }

  // JSON malformado ou grande demais (body-parser).
  const http = erro as { type?: string; status?: number };
  if (http?.type === "entity.parse.failed") {
    return res.status(400).json({ mensagem: "JSON invalido no corpo da requisicao." });
  }
  if (http?.type === "entity.too.large") {
    return res.status(413).json({ mensagem: "Corpo da requisicao grande demais." });
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2025") {
      return res.status(404).json({ mensagem: "Recurso nao encontrado." });
    }
    if (erro.code === "P2002") {
      return res.status(409).json({ mensagem: "Registro duplicado." });
    }
    if (erro.code === "P2003") {
      return res.status(400).json({ mensagem: "Referencia invalida." });
    }
  }

  console.error(erro);
  return res.status(500).json({ mensagem: "Erro interno do servidor." });
};
