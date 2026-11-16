import { Request, Response } from "express";
import { avaliacaoService } from "../services/avaliacao.service";

export class AvaliacoesController {
  async criar(req: Request, res: Response) {
    const resultado = await avaliacaoService.criar({
      ...req.body,
      usuarioId: req.usuario!.id,
    });
    return res.status(201).json(resultado);
  }

  async listarPorProduto(req: Request, res: Response) {
    const resultado = await avaliacaoService.listarPorProduto(req.params.id);
    return res.json(resultado);
  }

  async listarPorArtesao(req: Request, res: Response) {
    const resultado = await avaliacaoService.listarPorArtesao(req.usuario!.id);
    return res.json(resultado);
  }

  async listarParaModeracao(req: Request, res: Response) {
    const resultado = await avaliacaoService.listarParaModeracao({
      status: req.query.status as string,
    });
    return res.json(resultado);
  }

  async moderar(req: Request, res: Response) {
    const resultado = await avaliacaoService.moderar(req.params.id, req.body.acao);
    return res.json(resultado);
  }

  async listarPorComprador(req: Request, res: Response) {
    const resultado = await avaliacaoService.listarPorComprador(req.usuario!.id);
    return res.json(resultado);
  }
}
