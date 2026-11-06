import { Router } from "express";
import { z } from "zod";
import { autenticar, artesaoApenas, adminApenas } from "../middleware/auth";
import { PainelController } from "../controllers/painel.controller";
import { AdminController } from "../controllers/admin.controller";

const router = Router();
const painel = new PainelController();
const admin = new AdminController();

router.get(
  "/produtos/recomendacoes",
  autenticar,
  (req, res, next) => painel.listarRecomendacoes(req, res).catch(next)
);

router.get(
  "/artesao/painel/metricas",
  autenticar,
  artesaoApenas,
  (req, res, next) => painel.metricasArtesao(req, res).catch(next)
);

router.get(
  "/artesao/envio/configuracoes",
  autenticar,
  artesaoApenas,
  (req, res, next) => painel.configuracoesEnvio(req, res).catch(next)
);

router.put(
  "/artesao/envio/configuracoes",
  autenticar,
  artesaoApenas,
  (req, res, next) => painel.alternarOpcaoEnvio(req, res).catch(next)
);

router.post(
  "/envios/cotacao",
  (req, res, next) => painel.cotarFrete(req, res).catch(next)
);

router.get(
  "/admin/painel/metricas",
  autenticar,
  adminApenas,
  (req, res, next) => admin.metricas(req, res).catch(next)
);

router.get(
  "/admin/perfil",
  autenticar,
  adminApenas,
  (req, res, next) => admin.buscarPerfil(req, res).catch(next)
);

router.put(
  "/admin/perfil",
  autenticar,
  adminApenas,
  (req, res, next) => admin.atualizarPerfil(req, res).catch(next)
);

router.put(
  "/admin/senha",
  autenticar,
  adminApenas,
  (req, res, next) => admin.alterarSenha(req, res).catch(next)
);

export default router;
