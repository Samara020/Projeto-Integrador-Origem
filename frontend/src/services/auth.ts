import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { http } from "@/lib/http";
import type { DadosCadastro, DadosLogin, DadosRecuperarSenha, DadosRedefinirSenha, RespostaMensagem, Sessao, Usuario } from "@/types";

const CHAVE = "sessao";

export const authService = {
  sessaoAtual(): Sessao | null {
    const sessao = lerLocal<Sessao>(CHAVE);
    // Sessões anteriores à integração não autenticam no backend.
    if (sessao && (!/^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(sessao.token))) {
      apagarLocal(CHAVE);
      return null;
    }
    return sessao;
  },
  async entrar(dados: DadosLogin): Promise<Sessao> {
    const sessao = await http<Sessao>("/auth/login", { metodo: "POST", corpo: dados });
    gravarLocal(CHAVE, sessao);
    return sessao;
  },
  async cadastrar(dados: DadosCadastro): Promise<Sessao> {
    await http<Usuario>("/auth/register", { metodo: "POST", corpo: dados });
    return this.entrar({ email: dados.email, senha: dados.senha });
  },
  atualizarNome(nome: string): Sessao | null {
    const sessao = this.sessaoAtual();
    if (!sessao) return null;
    const atualizada = { ...sessao, usuario: { ...sessao.usuario, nome } };
    gravarLocal(CHAVE, atualizada);
    return atualizada;
  },
  async sair(): Promise<void> {
    const sessao = this.sessaoAtual();
    try {
      if (sessao?.token) {
        await http<RespostaMensagem>("/auth/logout", { metodo: "POST" });
      }
    } catch {
    } finally {
      apagarLocal(CHAVE);
    }
  },
  recuperarSenha(dados: DadosRecuperarSenha) {
    return http<RespostaMensagem>("/auth/recuperar-senha", { metodo: "POST", corpo: dados });
  },
  redefinirSenha(dados: DadosRedefinirSenha) {
    return http<RespostaMensagem>("/auth/redefinir-senha", { metodo: "POST", corpo: dados });
  },
};