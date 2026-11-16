import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Middleware para validacao e higienizacao de corpo de requisicao via Zod.
 * Encaminha qualquer falha de validacao ao middleware central de tratamento de erros.
 */
export const validarCorpo = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (erro) {
      next(erro);
    }
  };
};

export const validarQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (erro) {
      next(erro);
    }
  };
};

export const validarParams = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (erro) {
      next(erro);
    }
  };
};
