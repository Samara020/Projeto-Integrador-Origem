import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, adminApenas } from "../middleware/auth";
import { ProdutosController } from "../controllers/produtos.controller";

const router = Router();
const controller = new ProdutosController();

const schemaProduto = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  categoria: z.string().min(1),
  tecnica: z.string().min(1),
  origem: z.string().min(1),
  preco: z.number().positive(),
  modalidadeProducao: z.enum(["PECA_UNICA", "PRONTA_ENTREGA", "SOB_ENCOMENDA"]),
  estoque: z.number().int().nonnegative(),
  prazoProducaoDias: z.number().int().nonnegative().nullable().optional(),
  capacidadeProducao: z.number().int().nonnegative().nullable().optional(),
  imagens: z.array(z.string().url()).default([]),
  sku: z.string().optional(),
  material: z.string().optional(),
  dimensoes: z.string().optional(),
  peso: z.number().positive().optional(),
  informacoesOrigem: z.string().optional(),
  certificado: z.string().optional(),
});

router.get("/", (req, res, next) => controller.listar(req, res).catch(next));
router.get("/comparar", (req, res, next) => controller.comparar(req, res).catch(next));
router.get("/recomendacoes", (req, res, next) => controller.recomendados(req, res).catch(next));
router.get("/:id", (req, res, next) => controller.buscarPorId(req, res).catch(next));

router.post("/", autenticar, artesaoApenas, (req, res, next) => {
  schemaProduto.parse(req.body);
  return controller.criar(req, res).catch(next);
});

router.put("/:id", autenticar, artesaoApenas, (req, res, next) =>
  controller.atualizar(req, res).catch(next)
);

router.delete("/:id", autenticar, artesaoApenas, (req, res, next) =>
  controller.inativar(req, res).catch(next)
);

router.get("/artesao/pecas", autenticar, artesaoApenas, (req, res, next) =>
  controller.listarPeloArtesao(req, res).catch(next)
);

router.put(
  "/artesao/pecas/:id/estoque",
  autenticar,
  artesaoApenas,
  (req, res, next) => controller.atualizarEstoque(req, res).catch(next)
);

router.get(
  "/admin/produtos/pendentes",
  autenticar,
  adminApenas,
  (req, res, next) => controller.listarPendentes(req, res).catch(next)
);

router.put(
  "/admin/produtos/:id/validacao",
  autenticar,
  adminApenas,
  (req, res, next) => controller.validar(req, res).catch(next)
);

export default router;
