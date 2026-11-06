import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, compradorApenas } from "../middleware/auth";
import { PedidosController } from "../controllers/pedidos.controller";

const router = Router();
const controller = new PedidosController();

const schemaCheckout = z.object({
  enderecoEntrega: z.object({
    cep: z.string().min(1),
    rua: z.string().min(1),
    numero: z.string().min(1),
  }),
});

router.post(
  "/checkout",
  autenticar,
  compradorApenas,
  (req, res, next) => {
    schemaCheckout.parse(req.body);
    return controller.checkout(req, res).catch(next);
  }
);

router.get(
  "/comprador/pedidos",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.listar(req, res).catch(next)
);

router.get(
  "/artesao/pedidos",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.listarRecebidos(req, res).catch(next)
);

router.put(
  "/artesao/pedidos/:id/status",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.atualizarStatus(req, res).catch(next)
);

export default router;
