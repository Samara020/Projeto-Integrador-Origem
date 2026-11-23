import { z } from "zod";
import { ErroApp } from "../middleware/error";
import {
  adminRepository,
  categoriaRepository,
  lojaRepository,
  produtoRepository,
  usuarioRepository,
} from "../repositories";
import { conferirSenha, protegerSenha } from "../lib/senha";
import { configuracaoPadrao, opcaoPorId } from "../lib/frete";

const pagos = ["PAGO", "EM_PRODUCAO", "PRONTO", "ENVIADO", "ENTREGUE"];
const somaItens = (itens: { subtotal: unknown }[]) => itens.reduce((s, i) => s + Number(i.subtotal), 0);
const schemaFrete = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido."),
  pesoKg: z.number().positive().max(1000),
  dimensoes: z.object({ altura: z.number().positive(), largura: z.number().positive(), profundidade: z.number().positive() }),
  opcaoEnvioId: z.string().optional(),
});

export const painelService = {
  async listarRecomendacoes(filtros: { produtoId?: string }) {
    return (await import("./produto.service")).produtoService.recomendados(filtros.produtoId ?? "");
  },

  async metricasArtesao(usuarioId: string) {
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    const { produtos, pedidos, notas } = loja
      ? await adminRepository.listarMetricasArtesao(loja.id)
      : { produtos: [], pedidos: [], notas: [] };

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const vendas = pedidos.filter(p => pagos.includes(p.status));
    const vendasMes = vendas.filter(p => p.data >= inicioMes).reduce((s, p) => s + somaItens(p.itens), 0);
    const anterior = vendas.filter(p => p.data >= inicioAnterior && p.data < inicioMes).reduce((s, p) => s + somaItens(p.itens), 0);
    const porDia = new Map<string, number>();
    for (const p of vendas.filter(p => p.data >= inicioMes)) {
      const dia = p.data.toISOString().slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + somaItens(p.itens));
    }
    const baixos = produtos.filter(p => !p.pausado && (p.estoque?.quantidadeDisponivel ?? 0) < 5);
    return {
      vendasMes, variacaoVendas: anterior ? Math.round((vendasMes - anterior) / anterior * 100) : 0,
      pedidosPendentes: pedidos.filter(p => ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_PRODUCAO", "PRONTO"].includes(p.status)).length,
      pedidosNovos: pedidos.filter(p => p.status === "PAGO").length,
      avaliacaoMedia: notas.length ? Math.round(notas.reduce((s, n) => s + n.nota, 0) / notas.length * 10) / 10 : 0,
      totalAvaliacoes: notas.length, visualizacoes: 0, variacaoVisualizacoes: 0,
      produtosAtivos: produtos.filter(p => !p.pausado && p.statusValidacao === "APROVADA" && (p.estoque?.quantidadeDisponivel ?? 0) > 0).length,
      vendasPorDia: [...porDia].map(([dia, valor]) => ({ dia, valor })),
      alertas: baixos.length ? [{ id: "estoque-baixo", quantidade: baixos.length, mensagem: "Peças com estoque baixo", acao: "Conferir estoque", destino: "/painel/artesao/estoque?situacao=ESTOQUE_BAIXO" }] : [],
      pedidosRecentes: pedidos.slice(0, 5).map(p => ({
        id: p.id, comprador: p.usuario.nome, itens: p.itens.map(i => i.produto.nome + " x " + i.quantidade).join(", "),
        valorTotal: somaItens(p.itens), statusProducao: p.status === "PAGO" ? "NOVO" : p.status,
      })),
      avaliacoesRecentes: notas.slice(0, 5).map(n => ({ id: n.id, autor: n.usuario.nome, produto: n.produto.nome, nota: n.nota, comentario: n.comentario ?? "", criadoEm: n.dataAvaliacao })),
    };
  },

  async configuracoesEnvio(usuarioId: string) {
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    return loja?.configuracaoEnvio ?? configuracaoPadrao();
  },

  async alternarOpcaoEnvio(usuarioId: string, dados: { opcaoId: string; ativa: boolean }) {
    const validado = z.object({ opcaoId: z.string(), ativa: z.boolean() }).parse(dados);
    opcaoPorId(validado.opcaoId);
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) throw new ErroApp(404, "Cadastre o perfil da loja antes de configurar o envio.");
    const atual = (loja.configuracaoEnvio ?? configuracaoPadrao()) as ReturnType<typeof configuracaoPadrao>;
    const configuracao = { ...atual, opcoes: atual.opcoes.map(o => o.id === validado.opcaoId ? { ...o, ativa: validado.ativa } : o) };
    await lojaRepository.atualizarConfiguracaoEnvio(loja.id, configuracao);
    return { id: validado.opcaoId, ativa: validado.ativa };
  },

  async cotarFrete(dados: unknown) {
    const entrada = schemaFrete.parse(dados);
    const opcao = opcaoPorId(entrada.opcaoEnvioId);
    // Tabela interna de frete; não simula consulta a uma transportadora externa.
    return { servico: { id: opcao.id, nome: opcao.nome, prazo: opcao.prazo }, valor: opcao.valor };
  },
};

export const adminService = {
  async metricasAdmin() {
    const {
      usuarios,
      artesaoCount,
      produtos,
      pagamentos,
      tickets,
      validacoesPendentes,
      denunciasPendentes,
    } = await adminRepository.listarMetricasAdmin();

    return {
      totalUsuarios: usuarios.length, totalArtesaos: artesaoCount, totalProdutos: produtos,
      totalVendas: pagamentos._count, volumeTransacionadoGlobal: Number(pagamentos._sum.valor ?? 0),
      validacoesPendentes, denunciasPendentes, ticketsSuporte: tickets.length,
      ticketsUrgentes: tickets.filter(t => t.prioridade === "ALTA").length,
      usuariosRecentes: usuarios.slice(0, 10).map(u => ({ id: u.id, nome: u.nome, papel: u.usuarioTipo })),
    };
  },

  async buscarPerfilAdmin(usuarioId: string) {
    const perfil = await usuarioRepository.buscarPorId(usuarioId);
    if (!perfil || perfil.usuarioTipo !== "ADMINISTRADOR") throw new ErroApp(404, "Administrador não encontrado.");
    return { nome: perfil.nome, email: perfil.email, funcao: perfil.funcao ?? "", telefone: perfil.telefone ?? "" };
  },

  async atualizarPerfilAdmin(usuarioId: string, entrada: unknown) {
    const dados = z.object({
      nome: z.string().trim().min(1, "Informe o nome de quem administra.").max(150),
      funcao: z.string().max(100).optional(), telefone: z.string().max(20).optional(),
    }).parse(entrada);
    await usuarioRepository.atualizarPerfil(usuarioId, dados);
    return { nome: dados.nome, atualizadoEm: new Date().toISOString() };
  },

  async alterarSenhaAdmin(usuarioId: string, entrada: unknown) {
    const dados = z.object({
      senhaAtual: z.string().min(1, "Informe a senha atual."),
      novaSenha: z.string().min(8, "Use pelo menos 8 caracteres."),
      confirmacao: z.string().min(1, "Confirme a nova senha."),
    }).refine(d => d.novaSenha === d.confirmacao, "As senhas não coincidem.").parse(entrada);
    const usuario = await usuarioRepository.buscarPorId(usuarioId);
    if (!usuario || !(await conferirSenha(dados.senhaAtual, usuario.senha))) throw new ErroApp(401, "Senha atual incorreta.");
    await usuarioRepository.atualizarSenha(usuario.id, await protegerSenha(dados.novaSenha));
    return { mensagem: "Senha alterada. Use a nova senha no próximo acesso." };
  },
};

export const catalogoService = {
  async categorias() { return categoriaRepository.listar(); },
  async tecnicas() {
    const produtos = await produtoRepository.listarTecnicasDistintas();
    return produtos.map(p => ({ id: p.tecnica, nome: p.tecnica }));
  },
  async regioes() {
    const produtos = await produtoRepository.listarRegioesDistintas();
    return produtos.map(p => ({ id: p.origem, nome: p.origem }));
  },
};
