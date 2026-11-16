import { Request, Response } from "express";
import { pagamentoService } from "../services/pagamento.service";

export class PagamentosController {
  async processar(req: Request, res: Response) {
    const resultado = await pagamentoService.processar(req.usuario!.id, req.body);
    return res.json(resultado);
  }
}
