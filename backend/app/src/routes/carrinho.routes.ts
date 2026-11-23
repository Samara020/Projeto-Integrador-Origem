import { Router } from "express";
import { z } from "zod";
import { autenticar, compradorApenas } from "../middleware/auth";
import { ErroApp } from "../middleware/error";
import { CarrinhoController } from "../controllers/carrinho.controller";

const router = Router();
const controller = new CarrinhoController();

const schemaAdicionarItem = z.object({
  produtoId: z.string(),
  quantidade: z.number().int().positive().default(1),
});
const schemaAtualizarQuantidade = z.object({
  quantidade: z.number().int().min(1),
}).strict();

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

router.put(
  "/itens/:produtoId",
  autenticar,
  compradorApenas,
  (req, res, next) => {
    const validacao = schemaAtualizarQuantidade.safeParse(req.body);
    if (!validacao.success) return next(new ErroApp(400, "Quantidade inválida."));
    req.body = validacao.data;
    return controller.atualizarQuantidadeItem(req, res).catch(next);
  }
);

router.delete(
  "/itens/:produtoId",
  autenticar,
  compradorApenas,
  (req, res, next) => controller.removerItem(req, res).catch(next)
);

export default router;
