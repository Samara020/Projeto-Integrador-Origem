import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { ErroApp } from "../middleware/error";

const router = Router();
const controller = new AuthController();

const PAPEIS_VALIDOS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];

router.post("/register", (req, res, next) => {
  const corpo = req.body;
  if (!corpo || typeof corpo !== "object" || !corpo.nome || !corpo.email || !corpo.senha) {
    throw new ErroApp(400, "Preencha nome, e-mail e senha.");
  }
  if (typeof corpo.senha !== "string" || corpo.senha.length < 8) {
    throw new ErroApp(400, "A senha precisa ter pelo menos 8 caracteres.");
  }
  if (!PAPEIS_VALIDOS.includes(corpo.papel)) {
    throw new ErroApp(400, "Escolha se você é comprador, artesão ou administrador.");
  }
  return controller.cadastrar(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  const corpo = req.body;
  if (!corpo || typeof corpo !== "object" || !corpo.email || !corpo.senha) {
    throw new ErroApp(400, "Informe e-mail e senha.");
  }
  return controller.login(req, res).catch(next);
});

router.post("/recuperar-senha", (req, res, next) => {
  return controller.recuperarSenha(req, res).catch(next);
});

export default router;
