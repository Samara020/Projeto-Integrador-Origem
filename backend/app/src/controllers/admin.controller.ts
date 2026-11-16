import { Request, Response } from "express";
import { adminService } from "../services/painel.service";
import { catalogoService } from "../services/painel.service";

export class AdminController {
  async metricas(req: Request, res: Response) {
    const resultado = await adminService.metricasAdmin();
    return res.json(resultado);
  }

  async buscarPerfil(req: Request, res: Response) {
    const resultado = await adminService.buscarPerfilAdmin();
    return res.json(resultado);
  }

  async atualizarPerfil(req: Request, res: Response) {
    const resultado = await adminService.atualizarPerfilAdmin(req.body);
    return res.json(resultado);
  }

  async alterarSenha(req: Request, res: Response) {
    const resultado = await adminService.alterarSenhaAdmin(req.body);
    return res.json(resultado);
  }
}

export class CatalogoController {
  async categorias(req: Request, res: Response) {
    const resultado = await catalogoService.categorias();
    return res.json(resultado);
  }

  async tecnicas(req: Request, res: Response) {
    const resultado = await catalogoService.tecnicas();
    return res.json(resultado);
  }

  async regioes(req: Request, res: Response) {
    const resultado = await catalogoService.regioes();
    return res.json(resultado);
  }
}
