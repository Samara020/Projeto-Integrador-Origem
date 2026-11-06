import { Router } from "express";
import { z } from "zod";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const controller = new AuthController();

const schemaCadastro = z.object({
  nome: z.string().min(2, "Nome precisa ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail invalido."),
  senha: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres."),
  papel: z.enum(["COMPRADOR", "ARTESAO", "ADMINISTRADOR"]),
  codigoConvite: z.string().optional(),
});

const schemaLogin = z.object({
  email: z.string().email(),
  senha: z.string(),
});

router.post("/register", (req, res, next) => {
  schemaCadastro.parse(req.body);
  return controller.cadastrar(req, res).catch(next);
});

router.post("/login", (req, res, next) => {
  schemaLogin.parse(req.body);
  return controller.login(req, res).catch(next);
});

router.post("/recuperar-senha", (req, res, next) => {
  return controller.recuperarSenha(req, res).catch(next);
});

export default router;
