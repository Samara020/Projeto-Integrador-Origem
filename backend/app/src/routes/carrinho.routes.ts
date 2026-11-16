import { Router } from "express";
import { z } from "zod";
import { autenticar, compradorApenas } from "../middleware/auth";
import { CarrinhoController } from "../controllers/carrinho.controller";

const router = Router();
const controller = new CarrinhoController();

const schemaAdicionarItem = z.object({
  produtoId: z.string(),
  quantidade: z.number().int().positive().default(1),
});

router.get("/", autenticar, compradorApenas, (req, res, next) =>
  controller.obter(req, res).catch(next)
);

router.post(
  "/itens",
  autenticar,
  compradorApenas,
  (req, res, next) => {
    schemaAdicionarItem.parse(req.body);
    return controller.adicionarItem(req, res).catch(next);
  }
);

router.delete(
  "/itens/:produtoId",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.removerItem(req, res).catch(next)
);

export default router;
