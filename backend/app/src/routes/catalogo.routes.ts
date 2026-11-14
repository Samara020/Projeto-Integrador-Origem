import { Router } from "express";
import { CatalogoController } from "../controllers/admin.controller";

const router = Router();
const controller = new CatalogoController();

router.get("/categorias", (req, res, next) => controller.categorias(req, res).catch(next));
router.get("/tecnicas", (req, res, next) => controller.tecnicas(req, res).catch(next));
router.get("/regioes", (req, res, next) => controller.regioes(req, res).catch(next));

export default router;
