import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../lib/jwt";

export interface UsuarioAutenticado {
  id: string;
  papel: string;
}

export const autenticar = (
  req: Request & { usuario?: UsuarioAutenticado },
  res: Response,
  next: NextFunction
) => {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Token de acesso nao informado." });
  }

  const token = cabecalho.slice(7);
  try {
    const decodido = verificarToken(token);
    req.usuario = { id: decodido.id, papel: decodido.papel };
    return next();
  } catch {
    return res.status(401).json({ mensagem: "Token invalido ou expirado." });
  }
};

export const exigirPapel = (...papeis: string[]) => {
  return (
    req: Request & { usuario?: UsuarioAutenticado },
    res: Response,
    next: NextFunction
  ) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ mensagem: "Acesso negado para esse papel." });
    }
    return next();
  };
};

export const adminApenas = exigirPapel("ADMINISTRADOR");
export const artesaoApenas = exigirPapel("ARTESAO");
export const compradorApenas = exigirPapel("COMPRADOR");

declare module "express-serve-static-core" {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}
