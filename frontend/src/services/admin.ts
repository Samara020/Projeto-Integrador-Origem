// Painel do administrador (ContratoDeAPI.md, 2.3, 2.8, 2.10 e 2.11).
// Leitura vai para a Fake API. A decisão do admin fica no localStorage e é aplicada
// por cima do item da API: Route Handler em deploy serverless não guarda estado.
// Avaliação 2: cada escrita vira um http() PUT e as leituras deixam de aplicar o local.
import { gravarLocalVerificado, lerLocal } from "@/lib/armazenamento";
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

// Grava ou lança: a decisão não pode aparecer como salva se o navegador recusou a gravação.
function gravarOuFalhar(chave: string, valor: unknown): void {
  if (!gravarLocalVerificado(chave, valor)) {
    throw new ApiError(507, "Não foi possível salvar no navegador. Libere espaço e tente de novo.");
  }
}

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
    const remota = await http<
      MetricasAdmin & {
        volumeTransacionadoGlobal?: number;
        totalUsuarios?: number;
      }
    >("/admin/painel/metricas", { sinal });
    const decididas = Object.keys(validacoes()).length;
    const moderadas = Object.keys(moderacoes()).length;
    return {
      totalUsuarios: remota.totalUsuarios ?? 0,
      totalArtesaos: remota.totalArtesaos ?? 0,
      volumeTransacionadoGlobal: remota.volumeTransacionadoGlobal ?? 0,
      totalVendas: remota.totalVendas ?? 0,
      variacaoVendas: remota.variacaoVendas ?? 0,
      totalArtesaosAtivos: remota.totalArtesaosAtivos ?? 0,
      novosArtesaosNoMes: remota.novosArtesaosNoMes ?? 0,
      totalProdutos: remota.totalProdutos ?? 0,
      novosProdutos: remota.novosProdutos ?? 0,
      ticketsSuporte: remota.ticketsSuporte ?? 0,
      ticketsUrgentes: remota.ticketsUrgentes ?? 0,
      validacoesPendentes: Math.max(
        (remota.validacoesPendentes ?? 0) - decididas,
        0,
      ),
      vendasPorRegiao: remota.vendasPorRegiao ?? [],
      categoriasMaisVendidas: remota.categoriasMaisVendidas ?? [],
      denunciasPendentes: Math.max(
        (remota.denunciasPendentes ?? 0) - moderadas,
        0,
      ),
      usuariosRecentes: remota.usuariosRecentes ?? [],
      atividadesRecentes: remota.atividadesRecentes ?? [],
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
    const sessao = authService.sessaoAtual();
    if (
      sessao?.token &&
      sessao.usuario.papel === "ADMINISTRADOR" &&
      process.env.NEXT_PUBLIC_API_URL
    ) {
      try {
        return await http<ResultadoValidacao>(`/admin/produtos/${encodeURIComponent(id)}/validacao`, {
          metodo: "PUT",
          corpo: decisao,
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    await esperar();
    const justificativa = decisao.justificativa.trim();
    if (decisao.status === "REPROVADA" && justificativa.length < 10) {
      throw new ApiError(400, "Explique o motivo da reprovação em pelo menos 10 caracteres.");
    }
    const atual = validacoes();
    if (atual[id]) throw new ApiError(409, "Esta peça já foi avaliada.");

    gravarOuFalhar(CHAVE_VALIDACOES, {
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
    const sessao = authService.sessaoAtual();
    if (
      sessao?.token &&
      sessao.usuario.papel === "ADMINISTRADOR" &&
      process.env.NEXT_PUBLIC_API_URL
    ) {
      try {
        return await http<ResultadoModeracao>(`/admin/avaliacoes/${encodeURIComponent(id)}/moderar`, {
          metodo: "PUT",
          corpo: { acao },
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    await esperar();
    const atual = moderacoes();
    if (atual[id]) throw new ApiError(409, "Esta avaliação já foi moderada.");

    const status: StatusAvaliacao = acao === "REMOVER" ? "REMOVIDO" : "PUBLICADO";
    gravarOuFalhar(CHAVE_MODERACOES, { ...atual, [id]: { status, moderadaEm: new Date().toISOString() } });
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

    gravarOuFalhar(CHAVE_PERFIL, { nome, funcao: dados.funcao.trim(), telefone: dados.telefone.trim() });
    authService.atualizarNome(nome);

    const sessao = authService.sessaoAtual();
    if (
      sessao?.token &&
      sessao.usuario.papel === "ADMINISTRADOR" &&
      process.env.NEXT_PUBLIC_API_URL
    ) {
      try {
        await http<PerfilAdminAtualizado>("/admin/perfil", {
          metodo: "PUT",
          corpo: dados,
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    return { nome, atualizadoEm: new Date().toISOString() };
  },

  // PUT /admin/senha (lacuna).
  async alterarSenha(dados: AlteracaoSenha): Promise<RespostaMensagem> {
    await esperar();
    if (!dados.senhaAtual) throw new ApiError(400, "Informe a senha atual.");
    if (dados.novaSenha.length < 8) {
      throw new ApiError(400, "Use pelo menos 8 caracteres.");
    }
    if (!dados.confirmacao) throw new ApiError(400, "Confirme a nova senha.");
    if (dados.novaSenha !== dados.confirmacao) throw new ApiError(400, "As senhas não coincidem.");

    const sessao = authService.sessaoAtual();
    if (
      sessao?.token &&
      sessao.usuario.papel === "ADMINISTRADOR" &&
      process.env.NEXT_PUBLIC_API_URL
    ) {
      try {
        return await http<RespostaMensagem>("/admin/senha", {
          metodo: "PUT",
          corpo: dados,
        });
      } catch {}
    }

    return {
      mensagem:
        "Senha conferida. Nesta demonstração a troca não fica gravada; continue entrando com a senha atual.",
    };
  },
};
