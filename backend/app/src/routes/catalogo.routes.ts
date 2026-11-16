import { Router } from "express";
import { CatalogoController } from "../controllers/admin.controller";
import prisma from "../lib/prisma";

const router = Router();
const controller = new CatalogoController();

router.get("/categorias", (req, res, next) => controller.categorias(req, res).catch(next));
router.get("/tecnicas", (req, res, next) => controller.tecnicas(req, res).catch(next));
router.get("/regioes", (req, res, next) => controller.regioes(req, res).catch(next));
router.get("/indicadores", async (_req, res, next) => {
  try {
    const [totalArtesaos, totalProdutos, avaliacoes] = await Promise.all([
      prisma.usuario.count({ where: { usuarioTipo: "ARTESAO" } }),
      prisma.produto.count(),
      prisma.avaliacao.aggregate({ _avg: { nota: true }, _count: { _all: true } }),
    ]);
    res.json({ totalArtesaos, totalProdutos, avaliacaoMedia: avaliacoes._avg.nota ?? 0, totalAvaliacoes: avaliacoes._count._all });
  } catch (erro) { next(erro); }
});

export default router;
