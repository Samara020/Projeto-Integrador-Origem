import { Router } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import { revogarToken } from "../lib/revogacao-token";
import { autenticar } from "../middleware/auth";
import { ErroApp } from "../middleware/error";
import { authService } from "../services/auth.service";

const roteador = Router();
const PAPEIS_VALIDOS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

roteador.post("/register", async (req, res, next) => {
  try {
    const corpo = req.body ?? {};
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
      throw new ErroApp(400, "Papel inválido.");
    }
    if (corpo.codigoConvite !== undefined && typeof corpo.codigoConvite !== "string") {
      throw new ErroApp(400, "Código de convite inválido.");
    }

    const resultado = await authService.cadastrar(corpo);
    res.status(201).json(resultado);
  } catch (erro) {
    next(erro);
  }
});

roteador.post("/login", async (req, res, next) => {
  try {
    const { email, senha } = req.body ?? {};
    if (typeof email !== "string" || typeof senha !== "string" || !email.trim() || !senha) {
      throw new ErroApp(400, "Informe e-mail e senha.");
    }
    const resultado = await authService.login({ email, senha });
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
});

roteador.post("/logout", autenticar, async (req, res, next) => {
  try {
    if (req.tokenBruto) {
      const segredo = process.env.JWT_SECRET ?? "";
      const payload = verify(req.tokenBruto, Buffer.from(segredo)) as JwtPayload;
      await revogarToken(req.tokenBruto, payload.exp);
    }
    res.json({ mensagem: "Sessão encerrada com sucesso." });
  } catch (erro) {
    next(erro);
  }
});

roteador.post("/recuperar-senha", async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !EMAIL_VALIDO.test(email.trim())) {
      throw new ErroApp(400, "Informe um endereço de e-mail válido.");
    }
    const resultado = await authService.recuperarSenha({ email });
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
});

roteador.post("/redefinir-senha", async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body ?? {};
    if (typeof token !== "string" || !token.trim()) {
      throw new ErroApp(400, "Informe o token de redefinição de senha.");
    }
    if (typeof novaSenha !== "string" || novaSenha.length < 8) {
      throw new ErroApp(400, "A nova senha precisa ter pelo menos 8 caracteres.");
    }
    const resultado = await authService.redefinirSenha({ token, novaSenha });
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
});

export default roteador;