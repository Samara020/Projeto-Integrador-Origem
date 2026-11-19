import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { verificarToken } from "../lib/jwt";
import { autenticar, revogarToken } from "../middleware/auth";
import { ErroApp } from "../middleware/error";

const router = Router();
const controller = new AuthController();

const PAPEIS_VALIDOS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", (req, res, next) => {
  const corpo = req.body;
  if (!corpo || typeof corpo !== "object" || !corpo.nome || !corpo.email || !corpo.senha) {
    throw new ErroApp(400, "Preencha nome, e-mail e senha.");
  }
  if (typeof corpo.nome !== "string" || corpo.nome.trim().length < 2) {
    throw new ErroApp(400, "Informe um nome válido com pelo menos 2 caracteres.");
  }
  if (typeof corpo.email !== "string" || !EMAIL_VALIDO.test(corpo.email.trim())) {
    throw new ErroApp(400, "Informe um endereço de e-mail válido.");
  }
  if (typeof corpo.senha !== "string" || corpo.senha.length < 8) {
    throw new ErroApp(400, "A senha precisa ter pelo menos 8 caracteres.");
  }
  if (typeof corpo.papel !== "string" || !PAPEIS_VALIDOS.includes(corpo.papel)) {
    throw new ErroApp(400, "Escolha se você é comprador, artesão ou administrador.");
  }
  if (corpo.codigoConvite !== undefined && typeof corpo.codigoConvite !== "string") {
    throw new ErroApp(400, "Código de convite inválido.");
  }
  return controller.cadastrar(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  const corpo = req.body;
  if (
    !corpo ||
    typeof corpo !== "object" ||
    typeof corpo.email !== "string" ||
    typeof corpo.senha !== "string" ||
    !corpo.email.trim() ||
    !corpo.senha
  ) {
    throw new ErroApp(400, "Informe e-mail e senha.");
  }
  return controller.login(req, res).catch(next);
});

router.post("/logout", autenticar, (req, res) => {
  const token = req.headers.authorization!.slice(7);
  const decodido = verificarToken(token);
  revogarToken(token, decodido.exp);
  return res.status(200).json({ mensagem: "Sessão encerrada com sucesso." });
});

router.post("/recuperar-senha", (req, res, next) => {
  return controller.recuperarSenha(req, res).catch(next);
});

export default router;