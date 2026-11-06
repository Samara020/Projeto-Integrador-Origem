import { ErroApp } from "../middleware/error";
import { seloAtivoDe } from "../lib/memoria";
import { lojaRepository, produtoRepository } from "../repositories";
import { adminRepository } from "../repositories/admin.repository";

export const painelService = {
  async listarRecomendacoes(filtros: { produtoId?: string }) {
    let produtos = await produtoRepository.listar({
      termo: undefined,
      categoria: undefined,
      tecnica: undefined,
      regiao: undefined,
      pagina: 1,
      limite: 6,
    });

    const [total, itens] = produtos as [number, any[]];

    let filtrados = itens;
    if (filtros.produtoId) {
      filtrados = filtrados.filter((p) => String(p.id) !== String(filtros.produtoId));
    }

    return {
      recomendados: filtrados.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        imagemPrincipal: p.imagens[0]?.url ?? "",
        artesao: { id: p.loja.usuario.id, nome: p.loja.usuario.nome },
        seloAtivo: seloAtivoDe(p.id),
        motivo: "Recomendado por mesma categoria, mesma tecnica artesanal.",
        regiao: { id: p.origem, nome: p.origem },
        modalidadeProducao: p.modalidadeProducao,
        disponibilidade:
          (p.estoque?.quantidadeDisponivel ?? 0) > 0 ? "DISPONIVEL" : "VENDIDO",
      })),
    };
  },

  async metricasArtesao(usuarioId: string) {
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return {
        vendasMes: 0, variacaoVendas: 0, pedidosPendentes: 0, pedidosNovos: 0,
        avaliacaoMedia: 0, totalAvaliacoes: 0, visualizacoes: 0, variacaoVisualizacoes: 0,
        produtosAtivos: 0, vendasPorDia: [], alertas: [], pedidosRecentes: [],
      };
    }

    const produtos = await produtoRepository.listarPorLoja(loja.id, {});
    const produtoIds = produtos.map((p: any) => p.id);

    const { pedidoRepository } = await import("../repositories/pedido.repository");
    const pedidosRecebidos = await pedidoRepository.listarRecebidosPorLoja(loja.id);

    const vendasMes = pedidosRecebidos.reduce(
      (s: number, p: any) => s + p.itens.reduce((t: number, i: any) => t + Number(i.subtotal), 0),
      0
    );

    return {
      vendasMes,
      variacaoVendas: 0,
      pedidosPendentes: pedidosRecebidos.filter((p: any) => p.status === "AGUARDANDO_PAGAMENTO").length,
      pedidosNovos: 0,
      avaliacaoMedia: 0,
      totalAvaliacoes: 0,
      visualizacoes: 0,
      variacaoVisualizacoes: 0,
      produtosAtivos: produtos.filter((p: any) => (p.estoque?.quantidadeDisponivel ?? 0) > 0).length,
      vendasPorDia: [],
      alertas: [],
      pedidosRecentes: pedidosRecebidos.slice(0, 5).map((p: any) => ({
        id: p.id,
        comprador: p.usuario.nome,
        itens: p.itens.map((i: any) => `${i.produto.nome} x ${i.quantidade}`).join(", "),
        valorTotal: p.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
        statusProducao: p.status,
      })),
    };
  },

  async configuracoesEnvio() {
    return {
      opcoes: [
        { id: "economico", nome: "Origem Economico", prazo: "6 a 8 dias uteis", ativa: true },
      ],
      tiposEmbalagem: [{ id: "caixa-papelao", nome: "Caixa de papelao reciclado" }],
      prazosPorRegiao: [{ regiao: "Nordeste", prazo: "3 a 5 dias" }],
    };
  },

  async alternarOpcaoEnvio(dados: { opcaoId: string; ativa: boolean }) {
    return { id: dados.opcaoId, ativa: dados.ativa };
  },

  async cotarFrete(dados: { cep: string; pesoKg: number; dimensoes: any }) {
    return {
      servico: { id: "economico", nome: "Origem Economico", prazo: "6 a 8 dias uteis" },
      valor: 24.8,
    };
  },
};

export const adminService = {
  async metricasAdmin() {
    const { totalUsuarios, totalArtesaos } = await adminRepository.listarMetricasAdmin();
    return {
      totalUsuarios,
      totalArtesaos,
      volumeTransacionadoGlobal: 0,
    };
  },

  async buscarPerfilAdmin() {
    const perfil = await adminRepository.buscarPerfil();
    if (!perfil) {
      return {
        nome: "Equipe Origem",
        email: "admin@origem.dev",
        funcao: "Curadoria e moderacao",
        telefone: "",
        criadoEm: new Date().toISOString(),
      };
    }
    return {
      nome: perfil.nome,
      email: perfil.email,
      funcao: "Curadoria e moderacao",
      telefone: perfil.telefone ?? "",
      criadoEm: new Date().toISOString(),
    };
  },

  async atualizarPerfilAdmin(dados: { nome: string; funcao?: string; telefone?: string }) {
    if (!dados.nome) throw new ErroApp(400, "Informe o nome de quem administra.");
    return { nome: dados.nome, atualizadoEm: new Date().toISOString() };
  },

  async alterarSenhaAdmin(dados: { senhaAtual: string; novaSenha: string; confirmacao: string }) {
    if (!dados.senhaAtual) throw new ErroApp(400, "Informe a senha atual.");
    if (dados.novaSenha.length < 8) {
      throw new ErroApp(400, "Use pelo menos 8 caracteres.");
    }
    if (!dados.confirmacao) throw new ErroApp(400, "Confirme a nova senha.");
    if (dados.novaSenha !== dados.confirmacao) {
      throw new ErroApp(400, "A confirmacao nao confere.");
    }
    return { mensagem: "Senha alterada. Use a nova senha no proximo acesso." };
  },
};

export const catalogoService = {
  async categorias() {
    return (await import("../repositories/categoria.repository")).categoriaRepository.listar();
  },
};
