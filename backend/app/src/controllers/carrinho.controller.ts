import { Request, Response } from "express";
import { carrinhoService } from "../services/carrinho.service";

export class CarrinhoController {
  async obter(req: Request, res: Response) {
    const resultado = await carrinhoService.obter(req.usuario!.id);
    return res.json(resultado);
  }

  async adicionarItem(req: Request, res: Response) {
    const resultado = await carrinhoService.adicionar(req.usuario!.id, req.body);
    return res.json(resultado);
  }

  async removerItem(req: Request, res: Response) {
    const resultado = await carrinhoService.removerItem(req.usuario!.id, req.params.produtoId);
    return res.json(resultado);
  }
}
