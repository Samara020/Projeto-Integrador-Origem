import { Request, Response } from "express";
import { pedidoService } from "../services/pedido.service";

export class PedidosController {
  async checkout(req: Request, res: Response) {
    const resultado = await pedidoService.checkout(req.usuario!.id, req.body);
    return res.status(201).json(resultado);
  }

  async listar(req: Request, res: Response) {
    const resultado = await pedidoService.listarPorUsuario(req.usuario!.id);
    return res.json(resultado);
  }

  async listarRecebidos(req: Request, res: Response) {
    const resultado = await pedidoService.listarRecebidosPorArtesao(req.usuario!.id);
    return res.json(resultado);
  }

  async atualizarStatus(req: Request, res: Response) {
    const resultado = await pedidoService.atualizarStatus(req.params.id, req.body);
    return res.json(resultado);
  }
}
