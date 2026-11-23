import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

/**
 * Mensagem para campo ausente. Tipo errado continua com a mensagem padrao do Zod,
 * que o tratamento central troca pelo aviso generico de dados invalidos.
 */
export const obrigatorio = (mensagem: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? mensagem : undefined),
});

/**
 * Middleware para validacao e higienizacao de corpo de requisicao via Zod.
 * Encaminha qualquer falha de validacao ao middleware central de tratamento de erros.
 */
export const validarCorpo = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (erro) {
      next(erro);
    }
  };
};

export const validarQuery = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as Request["query"];
      next();
    } catch (erro) {
      next(erro);
    }
  };
};

export const validarParams = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as Request["params"];
      next();
    } catch (erro) {
      next(erro);
    }
  };
};
