import * as bcrypt from "bcryptjs";
import { gerarToken } from "../lib/jwt";
import { ErroApp } from "../middleware/error";
import { usuarioRepository } from "../repositories/usuario.repository";

const RODADAS_HASH = 12;
const HASH_BCRYPT = /^\$2[aby]\$\d{2}\$/;

export const authService = {
  async cadastrar(dados: {
    nome: string;
    email: string;
    senha: string;
    papel: string;
    codigoConvite?: string;
  }) {
    const emailNormalizado = dados.email.trim().toLowerCase();

    const existe = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (existe) {
      throw new ErroApp(400, "Já existe uma conta com esse e-mail.");
    }

    if (dados.papel === "ADMINISTRADOR") {
      const codigo = dados.codigoConvite?.trim().toLowerCase();

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

    const token = gerarToken({
      id: String(usuario.id),
      email: usuario.email,
      papel: usuario.usuarioTipo,
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
    const emailNormalizado = dados.email.trim().toLowerCase();

    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (!usuario) {
      throw new ErroApp(401, "E-mail ou senha incorretos.");
    }

    let senhaValida = false;

    if (HASH_BCRYPT.test(usuario.senha)) {
      senhaValida = await bcrypt.compare(dados.senha, usuario.senha);
    } else {
      senhaValida = usuario.senha === dados.senha;

      if (senhaValida) {
        const novoHash = await bcrypt.hash(dados.senha, RODADAS_HASH);
        await usuarioRepository.atualizarSenha(usuario.id, novoHash);
      }
    }

    if (!senhaValida) {
      throw new ErroApp(401, "E-mail ou senha incorretos.");
    }

    const token = gerarToken({
      id: String(usuario.id),
      email: usuario.email,
      papel: usuario.usuarioTipo,
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
    await usuarioRepository.buscarPorEmail(dados.email);

    return {
      mensagem: "E-mail de recuperação enviado com sucesso.",
    };
  },
};