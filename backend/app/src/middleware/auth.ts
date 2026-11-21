import { NextFunction, Request, Response } from "express";
import { verificarToken } from "../lib/jwt";
import { sessaoUsuarioInvalidada, tokenFoiRevogado } from "../lib/revogacao-token";

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        email?: string;
        papel: string;
      };
      tokenBruto?: string;
    }
  }
}

export const autenticar = async (req: Request, res: Response, next: NextFunction) => {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith("Bearer ")) {
    return res.status(401).json({ mensagem: "Token de autenticação não informado." });
  }

  const token = cabecalho.slice(7);

  try {
    if (await tokenFoiRevogado(token)) {
      return res.status(401).json({ mensagem: "Sessão encerrada. Faça login novamente." });
    }
    const dados = verificarToken(token);
    if (await sessaoUsuarioInvalidada(dados.id, dados.iat)) {
      return res.status(401).json({ mensagem: "Sessão encerrada após alteração de senha. Faça login novamente." });
    }
    req.usuario = dados;
    req.tokenBruto = token;
    next();
  } catch {
    return res.status(401).json({ mensagem: "Token de autenticação inválido." });
  }
};

export const exigirPapel = (...papeis: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ mensagem: "Não autenticado." });
    }

    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ mensagem: "Acesso negado para este perfil." });
    }

    next();
  };
};

export const compradorApenas = exigirPapel("COMPRADOR");
export const artesaoApenas = exigirPapel("ARTESAO");
export const adminApenas = exigirPapel("ADMINISTRADOR");