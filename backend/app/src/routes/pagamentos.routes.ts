import { Router } from "express";
import { z } from "zod";
import { autenticar, compradorApenas } from "../middleware/auth";
import { PagamentosController } from "../controllers/pagamentos.controller";

const router = Router();
const controller = new PagamentosController();

const schemaPagamento = z.object({
  pedidoId: z.string(),
  metodoPagamento: z.enum(["CARTAO_CREDITO", "PIX", "BOLETO"]),
  tokenCartao: z.string().nullable(),
});

router.post("/", autenticar, compradorApenas, (req, res, next) => {
  schemaPagamento.parse(req.body);
  return controller.processar(req, res).catch(next);
});

export default router;
