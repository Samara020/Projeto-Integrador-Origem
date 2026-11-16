import { Request, Response } from "express";
import { authService } from "../services/auth.service";

export class AuthController {
  async cadastrar(req: Request, res: Response) {
    const resultado = await authService.cadastrar(req.body);
    return res.status(201).json({
      id: resultado.id,
      nome: resultado.nome,
      email: resultado.email,
      papel: resultado.papel,
      criadoEm: resultado.criadoEm,
    });
  }

  async login(req: Request, res: Response) {
    const resultado = await authService.login(req.body);
    return res.json({
      token: resultado.token,
      tipo: resultado.tipo,
      usuario: resultado.usuario,
    });
  }

  async recuperarSenha(req: Request, res: Response) {
    const resultado = await authService.recuperarSenha(req.body);
    return res.json(resultado);
  }
}
