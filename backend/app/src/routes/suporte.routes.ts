import { Router } from "express";
import { z } from "zod";
import { autenticar } from "../middleware/auth";
import { SuporteController } from "../controllers/suporte.controller";
import { suporteService } from "../services/suporte.service";
import { validarCorpo } from "../middleware/validacao";

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

router.post("/tickets/:id/mensagens", autenticar,
  validarCorpo(z.object({ texto: z.string().trim().min(1).max(10000) })),
  (req, res, next) => suporteService.responder(req.params.id, req.usuario!.id, req.body.texto).then(t => res.json(t)).catch(next));

router.put("/tickets/:id/status", autenticar,
  validarCorpo(z.object({ status: z.enum(["ABERTO", "ESCALADO_HUMANO", "RESOLVIDO"]) })),
  (req, res, next) => suporteService.alterarStatus(req.params.id, req.usuario!.id, req.body.status).then(t => res.json(t)).catch(next));

export default router;
