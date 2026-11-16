import { Request, Response } from "express";
import { suporteService } from "../services/suporte.service";

export class SuporteController {
  async abrir(req: Request, res: Response) {
    const resultado = await suporteService.abrir({
      ...req.body,
      usuarioId: req.usuario!.id,
    });
    return res.status(201).json(resultado);
  }

  async listar(req: Request, res: Response) {
    const resultado = await suporteService.listarPorUsuario(req.usuario!.id);
    return res.json(resultado);
  }

  async buscarPorId(req: Request, res: Response) {
    const resultado = await suporteService.buscarPorId(req.params.id);
    return res.json(resultado);
  }
}
