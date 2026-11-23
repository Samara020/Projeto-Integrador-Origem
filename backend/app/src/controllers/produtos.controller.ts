import { Request, Response } from "express";
import { produtoService } from "../services/produto.service";

export class ProdutosController {
  async listar(req: Request, res: Response) {
    const resultado = await produtoService.listar(req.query);
    return res.json({
      total: resultado.total,
      pagina: resultado.pagina,
      limite: resultado.limite,
      itens: resultado.itens,
    });
  }

  async buscarPorId(req: Request, res: Response) {
    const resultado = await produtoService.buscarPublico(req.params.id);
    return res.json(resultado);
  }

  async comparar(req: Request, res: Response) {
    const idsParam = (req.query.ids as string) ?? "";
    const resultado = await produtoService.comparar(idsParam);
    return res.json(resultado);
  }

  async recomendados(req: Request, res: Response) {
    const resultado = await produtoService.recomendados({
      produtoId: req.query.produtoId as string | undefined,
      categoria: req.query.categoria as string | undefined,
      tecnica: req.query.tecnica as string | undefined,
      regiao: req.query.regiao as string | undefined,
      limite: req.query.limite as string | undefined,
    });
    res.setHeader("X-Recomendacao-Fonte", resultado.fonte);
    return res.json({
      recomendados: resultado.recomendados,
      produtosRecomendados: resultado.produtosRecomendados,
    });
  }

  async criar(req: Request, res: Response) {
    const resultado = await produtoService.criar(req.body, req.usuario!.id);
    return res.status(201).json(resultado);
  }

  async atualizar(req: Request, res: Response) {
    const resultado = await produtoService.atualizar(req.params.id, req.body, req.usuario!.id);
    return res.json(resultado);
  }

  async inativar(req: Request, res: Response) {
    const resultado = await produtoService.inativar(req.params.id, req.usuario!.id);
    return res.json(resultado);
  }

  async listarPeloArtesao(req: Request, res: Response) {
    const resultado = await produtoService.listarPeloArtesao(req.usuario!.id, {
      situacao: req.query.situacao as string,
    });
    return res.json(resultado);
  }

  async atualizarEstoque(req: Request, res: Response) {
    const resultado = await produtoService.atualizarEstoque(
      req.params.id,
      req.body,
      req.usuario!.id
    );
    return res.json(resultado);
  }

  async listarPendentes(req: Request, res: Response) {
    const resultado = await produtoService.listarPendentes({
      status: req.query.status as string,
    });
    return res.json(resultado);
  }

  async validar(req: Request, res: Response) {
    const resultado = await produtoService.validar(req.params.id, req.body, req.usuario?.id);
    return res.json(resultado);
  }
}
