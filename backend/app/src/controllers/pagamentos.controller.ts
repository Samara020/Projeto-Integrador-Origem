import { Request, Response } from "express";
import { pagamentoService } from "../services/pagamento.service";

export class PagamentosController {
  async processar(req: Request, res: Response) {
    const cabecalhoIdempotencia =
      req.header("Idempotency-Key") ?? req.header("X-Idempotency-Key") ?? undefined;
    const idempotencyKey =
      req.body.idempotencyKey ?? req.body.eventoId ?? cabecalhoIdempotencia ?? null;

    const { httpStatus, corpo } = await pagamentoService.processar(req.usuario!.id, {
      ...req.body,
      idempotencyKey,
    });
    return res.status(httpStatus).json(corpo);
  }
}
