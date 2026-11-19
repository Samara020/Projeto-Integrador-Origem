import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../lib/jwt";

export interface UsuarioAutenticado {
  id: string;
  papel: string;
}

const tokensRevogados = new Map<string, number>();

export const revogarToken = (token: string, expSegundos?: number) => {
  const agora = Math.floor(Date.now() / 1000);
  for (const [t, exp] of tokensRevogados.entries()) {
    if (exp <= agora) tokensRevogados.delete(t);
  }
  tokensRevogados.set(token, expSegundos ?? agora + 7 * 24 * 60 * 60);
};

export const tokenFoiRevogado = (token: string): boolean => {
  const exp = tokensRevogados.get(token);
  if (!exp) return false;
  if (exp <= Math.floor(Date.now() / 1000)) {
    tokensRevogados.delete(token);
    return false;
  }
  return true;
};

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
  if (tokenFoiRevogado(token)) {
    return res.status(401).json({ mensagem: "Sessao encerrada. Faca login novamente." });
  }

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