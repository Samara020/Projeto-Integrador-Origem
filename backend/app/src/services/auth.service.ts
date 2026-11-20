import * as bcrypt from "bcryptjs";
import { gerarToken } from "../lib/jwt";
import { ErroApp } from "../middleware/error";
import { recuperacaoRepository } from "../repositories/recuperacao.repository";
import { usuarioRepository } from "../repositories/usuario.repository";

const RODADAS_HASH = 12;
const HASH_BCRYPT = /^\$2[aby]\$\d{2}\$/;
const MENSAGEM_GENERICA = "Se o e-mail estiver cadastrado, você receberá as instruções em instantes.";

type Entrega = { tipo: "console" } | { tipo: "webhook"; url: string };

function configurarEntrega(): Entrega | null {
  const tipo = process.env.RECUPERACAO_SENHA_ENTREGA?.trim().toLowerCase();
  if (tipo === "console") return { tipo };
  if (tipo === "webhook") {
    const url = process.env.RECUPERACAO_SENHA_WEBHOOK_URL?.trim();
    if (url) return { tipo, url };
  }
  return null;
}

async function entregarToken(entrega: Entrega, email: string, token: string, expiraEm: Date) {
  if (entrega.tipo === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new ErroApp(503, "Recuperação de senha indisponível. Fale com o suporte.");
    }
    console.log(`[recuperacao-senha] ${email} token=${token} expira=${expiraEm.toISOString()}`);
    return;
  }

  const resposta = await fetch(entrega.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, token, expiraEm: expiraEm.toISOString() }),
    signal: AbortSignal.timeout(5000),
  });
  if (!resposta.ok) {
    throw new ErroApp(503, "Não foi possível enviar o e-mail de recuperação agora. Tente de novo.");
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authService = {
  async cadastrar(dados: {
    nome: string;
    email: string;
    senha: string;
    papel: string;
    codigoConvite?: string;
  }) {
    if (typeof dados.nome !== "string" || !dados.nome.trim()) {
      throw new ErroApp(400, "Preencha nome, e-mail e senha.");
    }
    if (typeof dados.email !== "string" || !dados.email.trim() || !EMAIL_REGEX.test(dados.email.trim())) {
      throw new ErroApp(400, "Formato de e-mail inválido.");
    }
    const emailNormalizado = dados.email.trim().toLowerCase();
    const existe = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (existe) throw new ErroApp(400, "Já existe uma conta com esse e-mail.");

    if (dados.papel === "ADMINISTRADOR") {
      const esperado = process.env.ADMIN_INVITE_CODE?.trim();
      const informado = dados.codigoConvite?.trim();
      if (!esperado || informado !== esperado) {
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
      usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.usuarioTipo },
    };
  },

  async login(dados: { email: string; senha: string }) {
    const emailNormalizado = dados.email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);

    if (!usuario) throw new ErroApp(401, "E-mail ou senha incorretos.");

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
    if (!senhaValida) throw new ErroApp(401, "E-mail ou senha incorretos.");

    const token = gerarToken({
      id: String(usuario.id),
      email: usuario.email,
      papel: usuario.usuarioTipo,
    });
    return {
      token,
      tipo: "Bearer",
      usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.usuarioTipo },
    };
  },

  async recuperarSenha(dados: { email: string }) {
    const entrega = configurarEntrega();
    if (!entrega) {
      throw new ErroApp(503, "Recuperação de senha indisponível. Fale com o suporte.");
    }

    const emailNormalizado = dados.email.trim().toLowerCase();
    const usuario = await usuarioRepository.buscarPorEmail(emailNormalizado);
    if (!usuario) return { mensagem: MENSAGEM_GENERICA };

    const { token, expiraEm } = await recuperacaoRepository.criar(usuario.id);
    await entregarToken(entrega, usuario.email, token, expiraEm);

    const resposta: { mensagem: string; token?: string; expiraEm?: string } = {
      mensagem: MENSAGEM_GENERICA,
    };
    if (process.env.NODE_ENV !== "production" && process.env.RECUPERACAO_SENHA_EXPOR_TOKEN === "true") {
      resposta.token = token;
      resposta.expiraEm = expiraEm.toISOString();
    }
    return resposta;
  },

  async redefinirSenha(dados: { token: string; senha: string }) {
    if (typeof dados.token !== "string" || dados.token.trim().length < 20) {
      throw new ErroApp(400, "Token de recuperação inválido ou expirado.");
    }
    if (typeof dados.senha !== "string" || dados.senha.length < 8) {
      throw new ErroApp(400, "A senha precisa ter pelo menos 8 caracteres.");
    }

    const senhaHash = await bcrypt.hash(dados.senha, RODADAS_HASH);
    await recuperacaoRepository.consumir(dados.token.trim(), senhaHash);
    return { mensagem: "Senha redefinida com sucesso." };
  },
};
