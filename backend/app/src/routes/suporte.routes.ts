import { Router } from "express";
import { z } from "zod";
import { autenticar } from "../middleware/auth";
import { SuporteController } from "../controllers/suporte.controller";

const router = Router();
const controller = new SuporteController();

const schemaTicket = z.object({
  assunto: z.string().min(2),
  mensagem: z.string().min(2),
  pedidoId: z.string().optional(),
  prioridade: z.enum(["NORMAL", "ALTA"]).optional(),
});

router.post("/tickets", autenticar, (req, res, next) => {
  schemaTicket.parse(req.body);
  return controller.abrir(req, res).catch(next);
});

router.get("/tickets", autenticar, (req, res, next) =>
  controller.listar(req, res).catch(next)
);

router.get("/tickets/:id", autenticar, (req, res, next) =>
  controller.buscarPorId(req, res).catch(next)
);

export default router;
