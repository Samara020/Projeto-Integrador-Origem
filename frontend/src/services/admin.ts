import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import type {
  AcaoModeracao, AlteracaoSenha, DecisaoValidacao, MetricasAdmin, PerfilAdmin,
  PerfilAdminAtualizado, PerfilAdminEdicao, RespostaAvaliacoesSinalizadas,
  RespostaMensagem, RespostaPecasPendentes, ResultadoModeracao, ResultadoValidacao,
  StatusAvaliacao, StatusValidacao,
} from "@/types";

export const adminService = {
  async metricas(sinal?: AbortSignal): Promise<MetricasAdmin> {
    let dados: Partial<MetricasAdmin>;
    try {
      dados = await http<Partial<MetricasAdmin>>("/admin/painel/metricas", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        dados = await http<Partial<MetricasAdmin>>("/painel/admin/painel/metricas", { sinal });
      } else {
        throw e;
      }
    }
    // Campos opcionais ainda não implementados não representam atividade inventada.
    return {
      totalUsuarios: dados.totalUsuarios ?? 0,
      totalArtesaos: dados.totalArtesaos ?? 0,
      volumeTransacionadoGlobal: dados.volumeTransacionadoGlobal ?? 0,
      totalVendas: dados.totalVendas ?? 0, variacaoVendas: dados.variacaoVendas ?? 0,
      totalArtesaosAtivos: dados.totalArtesaosAtivos ?? dados.totalArtesaos ?? 0,
      novosArtesaosNoMes: dados.novosArtesaosNoMes ?? 0,
      totalProdutos: dados.totalProdutos ?? 0, novosProdutos: dados.novosProdutos ?? 0,
      ticketsSuporte: dados.ticketsSuporte ?? 0, ticketsUrgentes: dados.ticketsUrgentes ?? 0,
      validacoesPendentes: dados.validacoesPendentes ?? 0,
      denunciasPendentes: dados.denunciasPendentes ?? 0,
      vendasPorRegiao: dados.vendasPorRegiao ?? [], categoriasMaisVendidas: dados.categoriasMaisVendidas ?? [],
      usuariosRecentes: dados.usuariosRecentes ?? [], atividadesRecentes: dados.atividadesRecentes ?? [],
      usuariosCadastrados: dados.usuariosCadastrados ?? [],
      artesaosCadastrados: dados.artesaosCadastrados ?? [],
    };
  },
  async pecasPendentes(status?: StatusValidacao, sinal?: AbortSignal): Promise<RespostaPecasPendentes> {
    try {
      return await http<RespostaPecasPendentes>("/admin/produtos/pendentes", { parametros: { status }, sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<RespostaPecasPendentes>("/produtos/admin/produtos/pendentes", { parametros: { status }, sinal });
      }
      throw e;
    }
  },
  async validarPeca(id: string, decisao: DecisaoValidacao): Promise<ResultadoValidacao> {
    try {
      return await http<ResultadoValidacao>(`/admin/produtos/${encodeURIComponent(id)}/validacao`, { metodo: "PUT", corpo: decisao });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<ResultadoValidacao>(`/produtos/admin/produtos/${encodeURIComponent(id)}/validacao`, { metodo: "PUT", corpo: decisao });
      }
      throw e;
    }
  },
  async avaliacoesSinalizadas(status?: StatusAvaliacao, sinal?: AbortSignal): Promise<RespostaAvaliacoesSinalizadas> {
    try {
      return await http<RespostaAvaliacoesSinalizadas>("/admin/avaliacoes", { parametros: { status }, sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<RespostaAvaliacoesSinalizadas>("/avaliacoes/admin/avaliacoes", { parametros: { status }, sinal });
      }
      throw e;
    }
  },
  async moderarAvaliacao(id: string, acao: AcaoModeracao): Promise<ResultadoModeracao> {
    try {
      return await http<ResultadoModeracao>(`/admin/avaliacoes/${encodeURIComponent(id)}/moderar`, { metodo: "PUT", corpo: { acao } });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<ResultadoModeracao>(`/avaliacoes/admin/avaliacoes/${encodeURIComponent(id)}/moderar`, { metodo: "PUT", corpo: { acao } });
      }
      throw e;
    }
  },
  async perfil(sinal?: AbortSignal): Promise<PerfilAdmin> {
    try {
      return await http<PerfilAdmin>("/admin/perfil", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<PerfilAdmin>("/painel/admin/perfil", { sinal });
      }
      throw e;
    }
  },
  async salvarPerfil(dados: PerfilAdminEdicao): Promise<PerfilAdminAtualizado> {
    let resposta: PerfilAdminAtualizado;
    try {
      resposta = await http<PerfilAdminAtualizado>("/admin/perfil", { metodo: "PUT", corpo: dados });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        resposta = await http<PerfilAdminAtualizado>("/painel/admin/perfil", { metodo: "PUT", corpo: dados });
      } else {
        throw e;
      }
    }
    authService.atualizarNome(resposta.nome);
    return resposta;
  },
  alterarSenha(dados: AlteracaoSenha): Promise<RespostaMensagem> {
    if (dados.novaSenha !== dados.confirmacao) throw new ApiError(400, "As senhas não coincidem.");
    return http<RespostaMensagem>("/admin/senha", { metodo: "PUT", corpo: dados }).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) {
        return http<RespostaMensagem>("/painel/admin/senha", { metodo: "PUT", corpo: dados });
      }
      throw e;
    });
  },
};
