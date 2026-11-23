import { Request, Response } from "express";
import { carrinhoService } from "../services/carrinho.service";
import { ErroApp } from "../middleware/error";

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

  async atualizarQuantidadeItem(req: Request, res: Response) {
    const quantidade = req.body?.quantidade;
    const { produtoId } = req.params;
    const usuarioId = req.usuario!.id;

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new ErroApp(400, "Quantidade inválida.");
    }

    const resultado = await carrinhoService.atualizarQuantidadeAbsoluta(usuarioId, produtoId, quantidade);
    return res.json(resultado);
  }
}
