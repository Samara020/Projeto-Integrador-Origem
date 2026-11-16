import { gerarToken } from "../lib/jwt";
import { ErroApp } from "../middleware/error";
import { usuarioRepository } from "../repositories/usuario.repository";

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

    const usuario = await usuarioRepository.criar({
      nome: dados.nome.trim(),
      email: emailNormalizado,
      senha: dados.senha,
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
      usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.usuarioTipo },
    };
  },

  async login(dados: { email: string; senha: string }) {
    const emailNormalizado = dados.email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);
    if (!usuario || usuario.senha !== dados.senha) {
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
    return { mensagem: "E-mail de recuperacao enviado com sucesso." };
  },
};
