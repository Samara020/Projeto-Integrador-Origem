import { Router } from "express";
import { z } from "zod";
import { autenticar, compradorApenas } from "../middleware/auth";
import { obrigatorio, validarCorpo } from "../middleware/validacao";
import { PagamentosController } from "../controllers/pagamentos.controller";

const router = Router();
const controller = new PagamentosController();

const METODOS_PAGAMENTO = ["CARTAO_CREDITO", "PIX", "BOLETO"] as const;

const schemaPagamento = z
  .object({
    pedidoId: z
      .string(obrigatorio("Informe o pedido."))
      .trim()
      .min(1, "Informe o pedido."),
    metodoPagamento: z.enum(METODOS_PAGAMENTO, {
      error: "Metodo de pagamento invalido. Opcoes: PIX, CARTAO_CREDITO, BOLETO.",
    }),
    tokenCartao: z.string().trim().nullable().default(null),
  })
  .refine((d) => d.metodoPagamento !== "CARTAO_CREDITO" || !!d.tokenCartao, {
    path: ["tokenCartao"],
    message: "Confira os dados do cartao.",
  });

router.post(
  "/",
  autenticar,
  compradorApenas,
  validarCorpo(schemaPagamento),
  (req, res, next) => controller.processar(req, res).catch(next)
);

export default router;
