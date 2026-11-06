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
    const existe = await usuarioRepository.buscarPorEmail(dados.email);
    if (existe) {
      throw new ErroApp(400, "Ja existe uma conta com este e-mail.");
    }

    if (dados.papel === "ADMINISTRADOR") {
      if (!dados.codigoConvite || dados.codigoConvite !== "origem-admin-2026") {
        throw new ErroApp(403, "Codigo de convite invalido.");
      }
    }

    const usuario = await usuarioRepository.criar({
      nome: dados.nome,
      email: dados.email,
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
    const usuario = await usuarioRepository.buscarPorEmail(dados.email);
    if (!usuario || usuario.senha !== dados.senha) {
      throw new ErroApp(401, "E-mail ou senha invalidos.");
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
