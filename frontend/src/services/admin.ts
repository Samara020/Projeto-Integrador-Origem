// Painel do administrador (ContratoDeAPI.md, 2.3, 2.8, 2.10 e 2.11).
// Leitura vai para a Fake API. A decisão do admin fica no localStorage e é aplicada
// por cima do item da API: Route Handler em deploy serverless não guarda estado.
// Avaliação 2: cada escrita vira um http() PUT e as leituras deixam de aplicar o local.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import type {
  AcaoModeracao,
  AlteracaoSenha,
  AvaliacaoSinalizada,
  DecisaoValidacao,
  MetricasAdmin,
  PecaPendente,
  PerfilAdmin,
  PerfilAdminAtualizado,
  PerfilAdminEdicao,
  RespostaAvaliacoesSinalizadas,
  RespostaMensagem,
  RespostaPecasPendentes,
  ResultadoModeracao,
  ResultadoValidacao,
  StatusAvaliacao,
  StatusValidacao,
} from "@/types";

const CHAVE_VALIDACOES = "admin:validacoes";
const CHAVE_MODERACOES = "admin:moderacoes";
const CHAVE_PERFIL = "admin:perfil";
const ATRASO_MS = 500;

type ValidacaoLocal = { status: Exclude<StatusValidacao, "PENDENTE">; justificativa: string; decididoEm: string };
type ModeracaoLocal = { status: StatusAvaliacao; moderadaEm: string };

function esperar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ATRASO_MS));
}

function validacoes(): Record<string, ValidacaoLocal> {
  return lerLocal(CHAVE_VALIDACOES) ?? {};
}

function moderacoes(): Record<string, ModeracaoLocal> {
  return lerLocal(CHAVE_MODERACOES) ?? {};
}

export const adminService = {
  // GET /admin/painel/metricas
  async metricas(sinal?: AbortSignal): Promise<MetricasAdmin> {
    const remota = await http<MetricasAdmin>("/admin/painel/metricas", { sinal });
    const decididas = Object.keys(validacoes()).length;
    const moderadas = Object.keys(moderacoes()).length;
    return {
      ...remota,
      validacoesPendentes: Math.max(remota.validacoesPendentes - decididas, 0),
      denunciasPendentes: Math.max(remota.denunciasPendentes - moderadas, 0),
    };
  },

  // GET /admin/produtos/pendentes
  async pecasPendentes(status?: StatusValidacao, sinal?: AbortSignal): Promise<RespostaPecasPendentes> {
    const remota = await http<RespostaPecasPendentes>("/admin/produtos/pendentes", { sinal });
    const locais = validacoes();
    const todas = remota.itens.map((peca): PecaPendente => {
      const decisao = locais[peca.id];
      if (!decisao) return peca;
      return {
        ...peca,
        statusValidacao: decisao.status,
        justificativa: decisao.justificativa,
        decididoEm: decisao.decididoEm,
      };
    });
    const itens = status ? todas.filter((peca) => peca.statusValidacao === status) : todas;
    return { total: itens.length, itens };
  },

  // PUT /admin/produtos/{id}/validacao
  async validarPeca(id: string, decisao: DecisaoValidacao): Promise<ResultadoValidacao> {
    await esperar();
    const justificativa = decisao.justificativa.trim();
    if (decisao.status === "REPROVADA" && justificativa.length < 10) {
      throw new ApiError(400, "Explique o motivo da reprovação em pelo menos 10 caracteres.");
    }
    const atual = validacoes();
    if (atual[id]) throw new ApiError(409, "Esta peça já foi avaliada.");

    gravarLocal(CHAVE_VALIDACOES, {
      ...atual,
      [id]: { status: decisao.status, justificativa, decididoEm: new Date().toISOString() },
    });
    return { id, statusValidacao: decisao.status, seloAtivo: decisao.status === "APROVADA" };
  },

  // GET /admin/avaliacoes (lacuna)
  async avaliacoesSinalizadas(
    status?: StatusAvaliacao,
    sinal?: AbortSignal,
  ): Promise<RespostaAvaliacoesSinalizadas> {
    const remota = await http<RespostaAvaliacoesSinalizadas>("/admin/avaliacoes", { sinal });
    const locais = moderacoes();
    const todas = remota.itens.map((avaliacao): AvaliacaoSinalizada => {
      const moderacao = locais[avaliacao.id];
      return moderacao ? { ...avaliacao, ...moderacao } : avaliacao;
    });
    const itens = status ? todas.filter((avaliacao) => avaliacao.status === status) : todas;
    return { total: itens.length, itens };
  },

  // PUT /admin/avaliacoes/{id}/moderar
  async moderarAvaliacao(id: string, acao: AcaoModeracao): Promise<ResultadoModeracao> {
    await esperar();
    const atual = moderacoes();
    if (atual[id]) throw new ApiError(409, "Esta avaliação já foi moderada.");

    const status: StatusAvaliacao = acao === "REMOVER" ? "REMOVIDO" : "PUBLICADO";
    gravarLocal(CHAVE_MODERACOES, { ...atual, [id]: { status, moderadaEm: new Date().toISOString() } });
    return { id, status };
  },

  // GET /admin/perfil (lacuna)
  async perfil(sinal?: AbortSignal): Promise<PerfilAdmin> {
    const remota = await http<PerfilAdmin>("/admin/perfil", { sinal });
    return { ...remota, ...(lerLocal<PerfilAdminEdicao>(CHAVE_PERFIL) ?? {}) };
  },

  // PUT /admin/perfil (lacuna)
  async salvarPerfil(dados: PerfilAdminEdicao): Promise<PerfilAdminAtualizado> {
    await esperar();
    const nome = dados.nome.trim();
    if (!nome) throw new ApiError(400, "Informe o nome de quem administra.");

    gravarLocal(CHAVE_PERFIL, { nome, funcao: dados.funcao.trim(), telefone: dados.telefone.trim() });
    authService.atualizarNome(nome);
    return { nome, atualizadoEm: new Date().toISOString() };
  },

  // PUT /admin/senha (lacuna). A senha nunca é gravada.
  async alterarSenha(dados: AlteracaoSenha): Promise<RespostaMensagem> {
    await esperar();
    if (!dados.senhaAtual) throw new ApiError(400, "Informe a senha atual.");
    if (dados.novaSenha.length < 8) {
      throw new ApiError(400, "Use pelo menos 8 caracteres.");
    }
    if (!dados.confirmacao) throw new ApiError(400, "Confirme a nova senha.");
    if (dados.novaSenha !== dados.confirmacao) throw new ApiError(400, "As senhas não coincidem.");
    return { mensagem: "Senha alterada. Use a nova senha no próximo acesso." };
  },
};
