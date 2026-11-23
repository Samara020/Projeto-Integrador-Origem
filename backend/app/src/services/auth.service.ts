import * as bcrypt from "bcryptjs";
import { sign, verify, type JwtPayload } from "jsonwebtoken";
import { enviarEmail } from "../lib/email";
import { gerarToken } from "../lib/jwt";
import { invalidarSessoesUsuario, obterVersaoSessaoUsuario, revogarToken, tokenFoiRevogado } from "../lib/revogacao-token";
import { ErroApp } from "../middleware/error";
import { recuperacaoRepository } from "../repositories/recuperacao.repository";
import { usuarioRepository } from "../repositories/usuario.repository";

const RODADAS_HASH = 12;
const PAPEIS_VALIDOS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function obterSegredoJwt(): string {
  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    throw new Error("JWT_SECRET nao definido no .env");
  }
  return segredo;
}

export const authService = {
  async cadastrar(dados: {
    nome: string;
    email: string;
    senha: string;
    papel: string;
    codigoConvite?: string;
  }) {
    if (!dados || typeof dados !== "object") {
      throw new ErroApp(400, "Dados inválidos.");
    }
    if (typeof dados.nome !== "string" || dados.nome.trim().length < 2) {
      throw new ErroApp(400, "Informe um nome válido com pelo menos 2 caracteres.");
    }
    if (typeof dados.email !== "string" || !EMAIL_VALIDO.test(dados.email.trim())) {
      throw new ErroApp(400, "Informe um endereço de e-mail válido.");
    }
    if (typeof dados.senha !== "string" || dados.senha.length < 8) {
      throw new ErroApp(400, "A senha precisa ter pelo menos 8 caracteres.");
    }
    if (typeof dados.papel !== "string" || !PAPEIS_VALIDOS.includes(dados.papel)) {
      throw new ErroApp(400, "Papel inválido.");
    }

    const emailNormalizado = dados.email.trim().toLowerCase();
    const existe = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (existe) {
      throw new ErroApp(400, "Já existe uma conta com esse e-mail.");
    }

    if (dados.papel === "ADMINISTRADOR") {
      const codigo = typeof dados.codigoConvite === "string" ? dados.codigoConvite.trim().toLowerCase() : "";
      if (!codigo || codigo !== "origem-admin-2026") {
        throw new ErroApp(403, "Código de convite inválido.");
      }
    }

    const senhaHash = await bcrypt.hash(dados.senha, RODADAS_HASH);

    const usuario = await usuarioRepository.criar({
      nome: dados.nome.trim(),
      email: emailNormalizado,
      senha: senhaHash,
      papel: dados.papel,
    });

    const sv = await obterVersaoSessaoUsuario(String(usuario.id));
    const token = gerarToken({
      id: String(usuario.id),
      email: usuario.email,
      papel: usuario.usuarioTipo,
      sv,
    });

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.usuarioTipo,
      criadoEm: new Date().toISOString(),
      token,
      tipo: "Bearer",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        papel: usuario.usuarioTipo,
      },
    };
  },

  async login(dados: { email: string; senha: string }) {
    if (!dados || typeof dados.email !== "string" || typeof dados.senha !== "string") {
      throw new ErroApp(400, "Informe e-mail e senha.");
    }

    const emailNormalizado = dados.email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (!usuario) {
      throw new ErroApp(401, "E-mail ou senha incorretos.");
    }

    const ehHashBcrypt = /^\$2[aby]\$\d{2}\$/.test(usuario.senha);
    const senhaValida = ehHashBcrypt
      ? await bcrypt.compare(dados.senha, usuario.senha)
      : dados.senha === usuario.senha;

    if (!senhaValida) {
      throw new ErroApp(401, "E-mail ou senha incorretos.");
    }

    if (!ehHashBcrypt) {
      const novoHash = await bcrypt.hash(dados.senha, RODADAS_HASH);
      await usuarioRepository.atualizarSenha(usuario.id, novoHash);
    }

    const sv = await obterVersaoSessaoUsuario(String(usuario.id));
    const token = gerarToken({
      id: String(usuario.id),
      email: usuario.email,
      papel: usuario.usuarioTipo,
      sv,
    });

    return {
      token,
      tipo: "Bearer",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        papel: usuario.usuarioTipo,
      },
    };
  },

  async recuperarSenha(dados: { email: string }) {
    if (!dados || typeof dados.email !== "string" || !EMAIL_VALIDO.test(dados.email.trim())) {
      throw new ErroApp(400, "Informe um endereço de e-mail válido.");
    }
    const emailNormalizado = dados.email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);
    const servidorTesteIsolado =
      process.env.NODE_ENV === "test" && process.env.ORIGEM_TEST_SERVER === "1";

    let tokenRecuperacao: string | undefined;
    if (usuario) {
      tokenRecuperacao = sign(
        {
          id: String(usuario.id),
          email: usuario.email,
          proposito: "REDEFINICAO_SENHA",
        },
        Buffer.from(obterSegredoJwt()),
        { expiresIn: "15m" }
      );

      const baseFrontend = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
      const linkRedefinicao = `${baseFrontend}/recuperar-senha?token=${encodeURIComponent(tokenRecuperacao)}`;

      await enviarEmail({
        para: usuario.email,
        assunto: "Origem — Redefinição de senha",
        texto: [
          `Olá, ${usuario.nome}.`,
          "",
          "Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Origem.",
          `Use o link abaixo (válido por 15 minutos):`,
          linkRedefinicao,
          "",
          `Ou informe o código de recuperação: ${tokenRecuperacao}`,
        ].join("\n"),
      });
    }

    return {
      mensagem: "Se o e-mail estiver cadastrado, enviamos as instruções para redefinição de senha.",
      ...(servidorTesteIsolado && tokenRecuperacao
        ? { token: tokenRecuperacao, tokenRecuperacao }
        : {}),
    };
  },

  async redefinirSenha(dados: { token: string; novaSenha: string }) {
    if (!dados || typeof dados.token !== "string" || !dados.token.trim()) {
      throw new ErroApp(400, "Informe o token de redefinição de senha.");
    }
    if (typeof dados.novaSenha !== "string" || dados.novaSenha.length < 8) {
      throw new ErroApp(400, "A nova senha precisa ter pelo menos 8 caracteres.");
    }

    const token = dados.token.trim();

    if (token.split(".").length !== 3) {
      const senhaHash = await bcrypt.hash(dados.novaSenha, RODADAS_HASH);
      const usuarioId = await recuperacaoRepository.consumir(token, senhaHash);
      await invalidarSessoesUsuario(String(usuarioId));
      return {
        mensagem: "Senha redefinida com sucesso.",
      };
    }

    if (await tokenFoiRevogado(token)) {
      throw new ErroApp(401, "Token de redefinição já utilizado ou expirado.");
    }

    let decodido: JwtPayload;
    try {
      const verificado = verify(token, Buffer.from(obterSegredoJwt()));
      if (!verificado || typeof verificado !== "object") {
        throw new ErroApp(401, "Token de redefinição inválido.");
      }
      decodido = verificado as JwtPayload;
    } catch {
      throw new ErroApp(401, "Token de redefinição inválido ou expirado.");
    }

    if (
      decodido.proposito !== "REDEFINICAO_SENHA" ||
      typeof decodido.id !== "string" ||
      !decodido.id.trim()
    ) {
      throw new ErroApp(401, "Token de redefinição inválido.");
    }

    const usuario = await usuarioRepository.buscarPorId(decodido.id);
    if (!usuario) {
      throw new ErroApp(404, "Usuário não encontrado.");
    }

    const senhaHash = await bcrypt.hash(dados.novaSenha, RODADAS_HASH);
    await usuarioRepository.atualizarSenha(usuario.id, senhaHash);
    await revogarToken(token, decodido.exp);
    await invalidarSessoesUsuario(String(usuario.id));

    return {
      mensagem: "Senha redefinida com sucesso.",
    };
  },
};