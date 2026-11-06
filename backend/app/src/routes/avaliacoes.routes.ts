import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, adminApenas } from "../middleware/auth";
import { AvaliacoesController } from "../controllers/avaliacoes.controller";

const router = Router();
const controller = new AvaliacoesController();

const schemaNovaAvaliacao = z.object({
  pedidoId: z.string(),
  produtoId: z.string(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

router.post("/", autenticar, (req, res, next) => {
  schemaNovaAvaliacao.parse(req.body);
  return controller.criar(req, res).catch(next);
});

router.get("/artesao/avaliacoes", autenticar, artesaoApenas, (req, res, next) =>
  controller.listarPorArtesao(req, res).catch(next)
);

router.put(
  "/admin/avaliacoes/:id/moderar",
  autenticar,
  adminApenas,
  (req, res, next) =>
    controller.moderar(req, res).catch(next)
);

router.get("/admin/avaliacoes", autenticar, adminApenas, (req, res, next) =>
  controller.listarParaModeracao(req, res).catch(next)
);

router.get(
  "/produtos/:id/avaliacoes",
  (req, res, next) => controller.listarPorProduto(req, res).catch(next)
);

router.get("/comprador/avaliacoes", autenticar, (req, res, next) =>
  controller.listarPorComprador(req, res).catch(next)
);

export default router;
