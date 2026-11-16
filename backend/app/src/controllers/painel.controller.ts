import { Request, Response } from "express";
import { painelService } from "../services/painel.service";

export class PainelController {
  async listarRecomendacoes(req: Request, res: Response) {
    const resultado = await painelService.listarRecomendacoes({
      produtoId: req.query.produtoId as string,
    });
    return res.json(resultado);
  }

  async metricasArtesao(req: Request, res: Response) {
    const resultado = await painelService.metricasArtesao(req.usuario!.id);
    return res.json(resultado);
  }

  async configuracoesEnvio(req: Request, res: Response) {
    const resultado = await painelService.configuracoesEnvio();
    return res.json(resultado);
  }

  async alternarOpcaoEnvio(req: Request, res: Response) {
    const resultado = await painelService.alternarOpcaoEnvio(req.body);
    return res.json(resultado);
  }

  async cotarFrete(req: Request, res: Response) {
    const resultado = await painelService.cotarFrete(req.body);
    return res.json(resultado);
  }
}
