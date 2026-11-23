// TC02 e TC12: validação do cadastro de peça e camada HTTP do painel do artesão
// (lib/validacao.ts e services/painelArtesao.ts com @/lib/http mockado).
import { ApiError, http } from "@/lib/http";
import { validarNovaPeca, type ErrosNovaPeca } from "@/lib/validacao";
import { painelArtesaoService } from "@/services/painelArtesao";
import type { NovoProduto, ProdutoCriado } from "@/types";
import { gravar, lerGravado } from "./apoio";

jest.mock("@/lib/http", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, mensagem: string) {
      super(mensagem);
      this.name = "ApiError";
      this.status = status;
    }
  },
  http: jest.fn(),
}));

const mockedHttp = http as jest.Mock;

const PECA: NovoProduto = {
  nome: "Bilro de Teste",
  descricao: "Renda de bilro feita à mão para o teste automatizado.",
  categoria: "Artesanato",
  tecnica: "Renda de bilro",
  material: "Linha de algodão",
  dimensoes: "30 x 30 cm",
  peso: 0.2,
  origem: "Caruaru, PE",
  preco: 90,
  modalidadeProducao: "PRONTA_ENTREGA",
  estoque: 5,
  informacoesOrigem: "Feita em Caruaru.",
  certificado: "",
  imagens: ["/imagens/bilro.jpg"],
};

beforeEach(() => {
  window.localStorage.clear();
  mockedHttp.mockReset();
});

describe("TC12 · validação de nova peça em lib/validacao (usada no formulário)", () => {
  test.each<[string, NovoProduto, keyof ErrosNovaPeca, string]>([
    ["nome vazio", { ...PECA, nome: "" }, "nome", "Dê um nome à peça."],
    ["nome só com espaços", { ...PECA, nome: "   " }, "nome", "Dê um nome à peça."],
    ["categoria ausente", { ...PECA, categoria: "" }, "categoria", "Escolha a categoria."],
    ["descrição curta", { ...PECA, descricao: "Curta demais" }, "descricao", "Conte a história da peça em pelo menos 20 caracteres."],
    ["técnica ausente", { ...PECA, tecnica: "" }, "tecnica", "Escolha a técnica."],
    ["material vazio", { ...PECA, material: "  " }, "material", "Informe o material."],
    ["dimensões vazias", { ...PECA, dimensoes: "" }, "dimensoes", "Informe as dimensões."],
    ["peso zero", { ...PECA, peso: 0 }, "peso", "Informe o peso em kg."],
    ["preço zero", { ...PECA, preco: 0 }, "preco", "Informe o preço."],
    ["preço negativo", { ...PECA, preco: -1 }, "preco", "Informe o preço."],
    ["estoque zero em pronta entrega", { ...PECA, estoque: 0 }, "estoque", "Tenha pelo menos uma peça pronta."],
    ["origem vazia", { ...PECA, informacoesOrigem: "  " }, "informacoesOrigem", "Conte de onde vem a peça."],
    ["sem foto", { ...PECA, imagens: [] }, "fotos", "Adicione ao menos uma foto."],
  ])("%s: aponta mensagem no campo %s", (_caso, peca, campo, mensagem) => {
    const erros = validarNovaPeca(peca);

    expect(erros[campo]).toBe(mensagem);
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("peça válida e preço mínimo positivo passam sem erros (valor-limite)", () => {
    expect(validarNovaPeca({ ...PECA, preco: 0.01 })).toEqual({});
    expect(
      validarNovaPeca({ ...PECA, modalidadeProducao: "PECA_UNICA", estoque: 0 }),
    ).toEqual({});
  });
});

describe("TC02 · painelArtesaoService envia HTTP real ao backend", () => {
  test("criarPeca envia POST /produtos com o payload completo e limpa rascunho ao confirmar", async () => {
    await painelArtesaoService.salvarRascunho(PECA);
    expect(painelArtesaoService.rascunho()).toEqual(PECA);

    const respostaApi: ProdutoCriado = {
      id: "2105",
      sku: "ORG-002105",
      statusValidacao: "PENDENTE",
      criadoEm: "2026-11-20T10:00:00.000Z",
    };
    mockedHttp.mockResolvedValueOnce(respostaApi);

    const criada = await painelArtesaoService.criarPeca(PECA);

    expect(criada).toEqual(respostaApi);
    expect(mockedHttp).toHaveBeenCalledWith("/produtos", {
      metodo: "POST",
      corpo: PECA,
    });
    expect(painelArtesaoService.rascunho()).toBeNull();
    expect(lerGravado("painel-artesao:pecas:novas")).toBeNull();
  });

  test("criarPeca propaga ApiError da API e preserva rascunho quando falha", async () => {
    gravar("painel-artesao:rascunho", PECA);
    mockedHttp.mockRejectedValueOnce(new ApiError(400, "Informe o material da peça."));

    await expect(painelArtesaoService.criarPeca(PECA)).rejects.toMatchObject({
      status: 400,
      message: "Informe o material da peça.",
    });
    expect(painelArtesaoService.rascunho()).toEqual(PECA);
  });

  test("pecas consulta GET /artesao/pecas com filtro situacao e AbortSignal", async () => {
    const controlador = new AbortController();
    const resposta = {
      total: 1,
      contagem: { ATIVO: 1, INATIVO: 0, ESGOTADO: 0, ESTOQUE_BAIXO: 0 },
      itens: [{ id: "2105", nome: PECA.nome, sku: "ORG-002105", imagemPrincipal: "/img.jpg", estoque: 5, situacao: "ATIVO" }],
    };
    mockedHttp.mockResolvedValueOnce(resposta);

    await expect(painelArtesaoService.pecas("ATIVO", controlador.signal)).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenCalledWith("/artesao/pecas", {
      parametros: { situacao: "ATIVO" },
      sinal: controlador.signal,
    });
  });

  test("alterarEstoque valida quantidade inteira não negativa no cliente antes do HTTP", async () => {
    await expect(painelArtesaoService.alterarEstoque("2105", -1)).rejects.toMatchObject({
      status: 400,
      message: "A quantidade em estoque não pode ser negativa.",
    });
    await expect(painelArtesaoService.alterarEstoque("2105", 1.5)).rejects.toMatchObject({
      status: 400,
      message: "A quantidade em estoque não pode ser negativa.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("alterarEstoque envia PUT /artesao/pecas/{id}/estoque com payload esperado", async () => {
    const retorno = { id: "2105", estoque: 0, situacao: "INATIVO" as const };
    mockedHttp.mockResolvedValueOnce(retorno);

    await expect(painelArtesaoService.alterarEstoque("2105/v1", 0, true)).resolves.toEqual(retorno);
    expect(mockedHttp).toHaveBeenCalledWith("/artesao/pecas/2105%2Fv1/estoque", {
      metodo: "PUT",
      corpo: { estoque: 0, pausada: true, situacao: "INATIVO" },
    });
  });

  test("removerPeca envia DELETE /produtos/{id} e propaga erro HTTP", async () => {
    mockedHttp.mockResolvedValueOnce(undefined);
    await painelArtesaoService.removerPeca("2105");
    expect(mockedHttp).toHaveBeenCalledWith("/produtos/2105", { metodo: "DELETE" });

    mockedHttp.mockRejectedValueOnce(new ApiError(403, "Sem permissão para excluir."));
    await expect(painelArtesaoService.removerPeca("2105")).rejects.toMatchObject({
      status: 403,
      message: "Sem permissão para excluir.",
    });
  });

  test("atualizarPedido exige código de rastreio ao marcar como ENVIADO", async () => {
    await expect(painelArtesaoService.atualizarPedido("500", "ENVIADO")).rejects.toMatchObject({
      status: 400,
      message: "Informe o código de rastreio para marcar como enviado.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("atualizarPedido envia PUT /artesao/pedidos/{id}/status e recarrega lista real", async () => {
    const pedidoAtualizado = {
      id: "500",
      comprador: "Comprador",
      valorTotal: 90,
      statusProducao: "ENVIADO" as const,
      criadoEm: "2026-11-20T10:00:00.000Z",
      itens: "Bilro de Teste × 1",
    };
    mockedHttp.mockResolvedValueOnce({ mensagem: "Atualizado" });
    mockedHttp.mockResolvedValueOnce({ pedidosRecebidos: [pedidoAtualizado] });

    await expect(
      painelArtesaoService.atualizarPedido("500", "ENVIADO", "BR123456789PE"),
    ).resolves.toEqual(pedidoAtualizado);

    expect(mockedHttp).toHaveBeenNthCalledWith(1, "/artesao/pedidos/500/status", {
      metodo: "PUT",
      corpo: { statusProducao: "ENVIADO", codigoRastreioCorreios: "BR123456789PE" },
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/artesao/pedidos", { sinal: undefined });
  });

  test("perfil, salvarPerfil, metricas, configuracoesEnvio e cotarFrete usam rotas HTTP reais", async () => {
    mockedHttp.mockResolvedValueOnce({ vendasMes: 450 });
    await painelArtesaoService.metricas();
    expect(mockedHttp).toHaveBeenLastCalledWith("/artesao/painel/metricas", { sinal: undefined });

    mockedHttp.mockResolvedValueOnce({ nomeArtistico: "Ateliê Raízes" });
    await painelArtesaoService.perfil();
    expect(mockedHttp).toHaveBeenLastCalledWith("/artesao/perfil", { sinal: undefined });

    mockedHttp.mockResolvedValueOnce({ nomeArtistico: "Novo Ateliê", atualizadoEm: "2026-11-20T10:00:00.000Z" });
    await painelArtesaoService.salvarPerfil({
      nomeArtistico: "Novo Ateliê",
      biografia: "Cerâmica do Agreste",
      regiao: "Agreste",
      tecnicas: ["Cerâmica"],
      foto: null,
      fotoCapa: null,
      contato: { telefone: "81999999999", redesSociais: "@atelieraizes" },
      certificacoes: [],
      dadosBancarios: "",
    });
    expect(mockedHttp).toHaveBeenLastCalledWith("/artesao/perfil", {
      metodo: "PUT",
      corpo: expect.objectContaining({ nomeArtistico: "Novo Ateliê" }),
    });

    mockedHttp.mockResolvedValueOnce({ cepOrigem: "50030-230", diasPostagem: 2, opcoes: [] });
    await painelArtesaoService.configuracoesEnvio();
    expect(mockedHttp).toHaveBeenLastCalledWith("/artesao/envio/configuracoes", { sinal: undefined });

    const dadosFrete = {
      cep: "50030-230",
      pesoKg: 1,
      dimensoes: { altura: 20, largura: 20, profundidade: 20 },
    };
    mockedHttp.mockResolvedValueOnce({ servico: { id: "economico", nome: "Econômico", prazo: "6 dias" }, valor: 18 });
    await painelArtesaoService.cotarFrete(dadosFrete);
    expect(mockedHttp).toHaveBeenLastCalledWith("/envios/cotacao", {
      metodo: "POST",
      corpo: dadosFrete,
    });
  });
});
