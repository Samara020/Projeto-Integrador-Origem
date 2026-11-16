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
    const dados = await http<Partial<MetricasAdmin>>("/admin/painel/metricas", { sinal });
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
    };
  },
  pecasPendentes: (status?: StatusValidacao, sinal?: AbortSignal) =>
    http<RespostaPecasPendentes>("/admin/produtos/pendentes", { parametros: { status }, sinal }),
  validarPeca(id: string, decisao: DecisaoValidacao) {
    return http<ResultadoValidacao>(`/admin/produtos/${encodeURIComponent(id)}/validacao`, { metodo: "PUT", corpo: decisao });
  },
  avaliacoesSinalizadas: (status?: StatusAvaliacao, sinal?: AbortSignal) =>
    http<RespostaAvaliacoesSinalizadas>("/admin/avaliacoes", { parametros: { status }, sinal }),
  moderarAvaliacao(id: string, acao: AcaoModeracao) {
    return http<ResultadoModeracao>(`/admin/avaliacoes/${encodeURIComponent(id)}/moderar`, { metodo: "PUT", corpo: { acao } });
  },
  perfil: (sinal?: AbortSignal) => http<PerfilAdmin>("/admin/perfil", { sinal }),
  async salvarPerfil(dados: PerfilAdminEdicao) {
    const resposta = await http<PerfilAdminAtualizado>("/admin/perfil", { metodo: "PUT", corpo: dados });
    authService.atualizarNome(resposta.nome);
    return resposta;
  },
  alterarSenha(dados: AlteracaoSenha) {
    if (dados.novaSenha !== dados.confirmacao) throw new ApiError(400, "As senhas não coincidem.");
    return http<RespostaMensagem>("/admin/senha", { metodo: "PUT", corpo: dados });
  },
};
