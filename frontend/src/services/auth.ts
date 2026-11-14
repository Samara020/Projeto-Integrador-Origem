import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import type {
  DadosCadastro,
  DadosLogin,
  DadosRecuperarSenha,
  DadosRedefinirSenha,
  PerfilAdminEdicao,
  RespostaMensagem,
  Sessao,
  Usuario,
} from "@/types";

const CHAVE = "sessao";
const ATRASO_MS = 600;

function esperar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ATRASO_MS));
}

export const authService = {
  sessaoAtual(): Sessao | null {
    return lerLocal<Sessao>(CHAVE);
  },

  async entrar(dados: DadosLogin): Promise<Sessao> {
    const recebida = await http<Sessao>("/auth/login", {
      metodo: "POST",
      corpo: dados,
    });
    const nomeDoPerfil =
      recebida.usuario.papel === "ADMINISTRADOR"
        ? lerLocal<PerfilAdminEdicao>("admin:perfil")?.nome
        : undefined;
    const sessao: Sessao = nomeDoPerfil
      ? { ...recebida, usuario: { ...recebida.usuario, nome: nomeDoPerfil } }
      : recebida;
    gravarLocal(CHAVE, sessao);
    return sessao;
  },

  async cadastrar(dados: DadosCadastro): Promise<Sessao> {
    const usuario = await http<Usuario>("/auth/register", {
      metodo: "POST",
      corpo: dados,
    });
    try {
      return await this.entrar({ email: dados.email, senha: dados.senha });
    } catch (erro) {
      if (process.env.NEXT_PUBLIC_API_URL !== "/api") {
        throw erro;
      }
      const sessao: Sessao = {
        token: `fake.${btoa(usuario.id)}.${Date.now()}`,
        tipo: "Bearer",
        usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
      };
      gravarLocal(CHAVE, sessao);
      return sessao;
    }
  },

  // Fake API: o nome novo do perfil do admin precisa aparecer no cabeçalho, que lê a sessão.
  // Sessão de outro papel não é tocada.
  atualizarNome(nome: string): Sessao | null {
    const sessao = lerLocal<Sessao>(CHAVE);
    if (!sessao || sessao.usuario.papel !== "ADMINISTRADOR") return null;
    const atualizada: Sessao = { ...sessao, usuario: { ...sessao.usuario, nome } };
    gravarLocal(CHAVE, atualizada);
    return atualizada;
  },

  async sair(): Promise<void> {
    apagarLocal(CHAVE);
  },

  async recuperarSenha(dados: DadosRecuperarSenha): Promise<RespostaMensagem> {
    try {
      return await http<RespostaMensagem>("/auth/recuperar-senha", {
        metodo: "POST",
        corpo: dados,
      });
    } catch {
      return {
        mensagem: `Se ${dados.email} tiver conta na Origem, o link chega em instantes.`,
      };
    }
  },

  // Avaliação 2: trocar por http("/auth/redefinir-senha", { metodo: "POST", corpo: dados }).
  async redefinirSenha(dados: DadosRedefinirSenha): Promise<RespostaMensagem> {
    await esperar();
    if (!dados.token) throw new ApiError(400, "O link de recuperação expirou. Peça um novo.");
    return { mensagem: "Senha alterada. Entre com a senha nova." };
  },
};
