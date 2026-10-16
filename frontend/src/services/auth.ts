import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import type {
  DadosCadastro,
  DadosLogin,
  DadosRecuperarSenha,
  DadosRedefinirSenha,
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
    const sessao = await http<Sessao>("/auth/login", {
      metodo: "POST",
      corpo: dados,
    });
    gravarLocal(CHAVE, sessao);
    return sessao;
  },

  // Fake API: o cadastro não fica guardado no servidor, então a sessão nasce aqui.
  // Avaliação 2: trocar o bloco final por uma chamada a entrar() com as mesmas credenciais.
  async cadastrar(dados: DadosCadastro): Promise<Sessao> {
    const usuario = await http<Usuario>("/auth/register", {
      metodo: "POST",
      corpo: dados,
    });
    const sessao: Sessao = {
      token: `fake.${usuario.id}.${Date.now()}`,
      tipo: "Bearer",
      usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    };
    gravarLocal(CHAVE, sessao);
    return sessao;
  },

  async sair(): Promise<void> {
    apagarLocal(CHAVE);
  },

  // Fake API: simulado no navegador; nenhum e-mail sai. A resposta é a mesma exista ou não a conta.
  // Avaliação 2: trocar por http("/auth/recuperar-senha", { metodo: "POST", corpo: dados }).
  async recuperarSenha(dados: DadosRecuperarSenha): Promise<RespostaMensagem> {
    await esperar();
    return { mensagem: `Se ${dados.email} tiver conta na Origem, o link chega em instantes.` };
  },

  // Avaliação 2: trocar por http("/auth/redefinir-senha", { metodo: "POST", corpo: dados }).
  async redefinirSenha(dados: DadosRedefinirSenha): Promise<RespostaMensagem> {
    await esperar();
    if (!dados.token) throw new ApiError(400, "O link de recuperação expirou. Peça um novo.");
    return { mensagem: "Senha alterada. Entre com a senha nova." };
  },
};
