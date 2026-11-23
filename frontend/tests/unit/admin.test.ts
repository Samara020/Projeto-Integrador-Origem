import { ApiError, http } from "@/lib/http";
import { adminService } from "@/services/admin";
import type {
  AvaliacaoSinalizada,
  MetricasAdmin,
  PecaPendente,
  PerfilAdmin,
  Sessao,
} from "@/types";
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

const TOKEN_FORMATO_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InVzcl8wMDEifQ.assinatura";

const peca = (id: string, statusValidacao: PecaPendente["statusValidacao"] = "PENDENTE"): PecaPendente => ({
  id,
  nome: `Peça ${id}`,
  imagemPrincipal: "/produtos/vaso-ceramica.jpg",
  artesao: { id: "usr_906", nome: "Zefa do Pajeú" },
  tecnica: "Cerâmica",
  regiao: "Sertão do Pajeú",
  enviadoEm: "2026-10-14T09:00:00Z",
  informacoesOrigem: "Barro do Pajeú.",
  certificado: null,
  statusValidacao,
  justificativa: null,
  decididoEm: null,
});

const avaliacao = (id: string, status: AvaliacaoSinalizada["status"] = "EM_MODERACAO"): AvaliacaoSinalizada => ({
  id,
  produto: { id: "prd_201", nome: "Vaso Cerâmica Raízes", imagemPrincipal: "/produtos/vaso-ceramica.jpg" },
  autor: "Carlos Mendes",
  nota: 4,
  comentario: "Me chama no zap.",
  criadoEm: "2026-10-16T18:10:00Z",
  motivo: "LINK_OU_CONTATO",
  sinalizadaEm: "2026-10-16T18:10:05Z",
  status,
  moderadaEm: null,
});

const respostaHttp = (corpo: unknown) => {
  (http as jest.Mock).mockResolvedValueOnce(corpo);
};

const erroHttp = (status: number, mensagem: string) => {
  (http as jest.Mock).mockRejectedValueOnce(new ApiError(status, mensagem));
};

// Tudo que está no localStorage, numa string só (Object.values no Storage do jsdom não é confiável).
const tudoGravado = () =>
  Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.getItem(window.localStorage.key(i) ?? "") ?? "").join(" ");

beforeEach(() => {
  window.localStorage.clear();
  (http as jest.Mock).mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("metricas", () => {
  test("chama GET /admin/painel/metricas e normaliza campos opcionais ausentes para zero ou lista vazia", async () => {
    const controlador = new AbortController();
    respostaHttp({
      totalUsuarios: 350,
      totalArtesaos: 45,
      volumeTransacionadoGlobal: 28450,
    });

    const resultado = await adminService.metricas(controlador.signal);

    expect(http).toHaveBeenCalledWith("/admin/painel/metricas", { sinal: controlador.signal });
    expect(resultado).toEqual({
      totalUsuarios: 350,
      totalArtesaos: 45,
      volumeTransacionadoGlobal: 28450,
      totalVendas: 0,
      variacaoVendas: 0,
      totalArtesaosAtivos: 45,
      novosArtesaosNoMes: 0,
      totalProdutos: 0,
      novosProdutos: 0,
      ticketsSuporte: 0,
      ticketsUrgentes: 0,
      validacoesPendentes: 0,
      denunciasPendentes: 0,
      vendasPorRegiao: [],
      categoriasMaisVendidas: [],
      usuariosRecentes: [],
      atividadesRecentes: [],
      usuariosCadastrados: [],
      artesaosCadastrados: [],
    });
  });

  test("preserva todos os campos preenchidos pelo backend sem alterar contagens", async () => {
    const completas: MetricasAdmin = {
      totalUsuarios: 350,
      totalArtesaos: 45,
      volumeTransacionadoGlobal: 28450,
      totalVendas: 120,
      variacaoVendas: 15,
      totalArtesaosAtivos: 38,
      novosArtesaosNoMes: 4,
      totalProdutos: 210,
      novosProdutos: 18,
      ticketsSuporte: 9,
      ticketsUrgentes: 2,
      validacoesPendentes: 5,
      denunciasPendentes: 3,
      vendasPorRegiao: [{ sigla: "PE", percentual: 65 }],
      categoriasMaisVendidas: [{ nome: "Cerâmica", percentual: 40 }],
      usuariosRecentes: [{ nome: "Maria Silva", papel: "ARTESAO" }],
      atividadesRecentes: ["Peça aprovada"],
      usuariosCadastrados: [],
      artesaosCadastrados: [],
    };
    respostaHttp(completas);

    await expect(adminService.metricas()).resolves.toEqual(completas);
  });

  test("propaga erro da API", async () => {
    erroHttp(403, "Acesso restrito ao administrador.");

    await expect(adminService.metricas()).rejects.toMatchObject({
      status: 403,
      message: "Acesso restrito ao administrador.",
    });
  });
});

describe("pecasPendentes", () => {
  test("envia filtro status e AbortSignal para GET /admin/produtos/pendentes", async () => {
    const controlador = new AbortController();
    const resposta = { total: 1, itens: [peca("prd_402", "PENDENTE")] };
    respostaHttp(resposta);

    await expect(adminService.pecasPendentes("PENDENTE", controlador.signal)).resolves.toEqual(resposta);
    expect(http).toHaveBeenCalledWith("/admin/produtos/pendentes", {
      parametros: { status: "PENDENTE" },
      sinal: controlador.signal,
    });
  });

  test("sem filtro envia status undefined e devolve resposta da API", async () => {
    const resposta = { total: 2, itens: [peca("prd_401", "APROVADA"), peca("prd_402", "PENDENTE")] };
    respostaHttp(resposta);

    await expect(adminService.pecasPendentes()).resolves.toEqual(resposta);
    expect(http).toHaveBeenCalledWith("/admin/produtos/pendentes", {
      parametros: { status: undefined },
      sinal: undefined,
    });
  });

  test("propaga rejeição de http", async () => {
    erroHttp(500, "Falha ao consultar fila.");

    await expect(adminService.pecasPendentes("PENDENTE")).rejects.toMatchObject({
      status: 500,
      message: "Falha ao consultar fila.",
    });
  });
});

describe("validarPeca", () => {
  test("aprovar envia PUT /admin/produtos/{id}/validacao e devolve decisão com selo ativo", async () => {
    const esperado = { id: "prd_401", statusValidacao: "APROVADA", seloAtivo: true };
    respostaHttp(esperado);

    await expect(
      adminService.validarPeca("prd_401", { status: "APROVADA", justificativa: "" }),
    ).resolves.toEqual(esperado);

    expect(http).toHaveBeenCalledWith("/admin/produtos/prd_401/validacao", {
      metodo: "PUT",
      corpo: { status: "APROVADA", justificativa: "" },
    });
    expect(lerGravado("admin:validacoes")).toBeNull();
  });

  test("codifica o id na rota e propaga erro 400 ou 409 do backend sem gravar localmente", async () => {
    erroHttp(400, "Explique o motivo da reprovação em pelo menos 10 caracteres.");

    await expect(
      adminService.validarPeca("prd/401", { status: "REPROVADA", justificativa: "curta" }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Explique o motivo da reprovação em pelo menos 10 caracteres.",
    });

    expect(http).toHaveBeenCalledWith("/admin/produtos/prd%2F401/validacao", {
      metodo: "PUT",
      corpo: { status: "REPROVADA", justificativa: "curta" },
    });
    expect(lerGravado("admin:validacoes")).toBeNull();

    erroHttp(409, "Esta peça já foi avaliada.");
    await expect(
      adminService.validarPeca("prd_401", { status: "REPROVADA", justificativa: "Fotos de produto industrial." }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Esta peça já foi avaliada.",
    });
  });
});

describe("avaliacoesSinalizadas", () => {
  test("envia status e AbortSignal para GET /admin/avaliacoes", async () => {
    const controlador = new AbortController();
    const resposta = { total: 1, itens: [avaliacao("avl_802")] };
    respostaHttp(resposta);

    await expect(adminService.avaliacoesSinalizadas("EM_MODERACAO", controlador.signal)).resolves.toEqual(resposta);
    expect(http).toHaveBeenCalledWith("/admin/avaliacoes", {
      parametros: { status: "EM_MODERACAO" },
      sinal: controlador.signal,
    });
  });

  test("propaga erro da API", async () => {
    erroHttp(500, "Erro ao buscar avaliações.");

    await expect(adminService.avaliacoesSinalizadas()).rejects.toMatchObject({
      status: 500,
      message: "Erro ao buscar avaliações.",
    });
  });
});

describe("moderarAvaliacao", () => {
  test.each([
    ["avl_801", "REMOVER", "REMOVIDO"],
    ["avl_802", "MANTER", "PUBLICADO"],
  ] as const)("id %s com ação %s envia PUT /admin/avaliacoes/{id}/moderar e devolve status %s", async (id, acao, status) => {
    respostaHttp({ id, status });

    await expect(adminService.moderarAvaliacao(id, acao)).resolves.toEqual({ id, status });
    expect(http).toHaveBeenCalledWith(`/admin/avaliacoes/${id}/moderar`, {
      metodo: "PUT",
      corpo: { acao },
    });
    expect(lerGravado("admin:moderacoes")).toBeNull();
  });

  test("codifica o id e propaga conflito 409 da API", async () => {
    erroHttp(409, "Esta avaliação já foi moderada.");

    await expect(adminService.moderarAvaliacao("avl/801", "MANTER")).rejects.toMatchObject({
      status: 409,
      message: "Esta avaliação já foi moderada.",
    });
    expect(http).toHaveBeenCalledWith("/admin/avaliacoes/avl%2F801/moderar", {
      metodo: "PUT",
      corpo: { acao: "MANTER" },
    });
  });
});

describe("perfil e salvarPerfil", () => {
  test("perfil() chama GET /admin/perfil e devolve os dados da API sem sobreposição local", async () => {
    const controlador = new AbortController();
    const perfilApi: PerfilAdmin = {
      nome: "Equipe Origem",
      email: "admin@origem.dev",
      funcao: "Curadoria e moderação",
      telefone: "",
      criadoEm: "2026-08-01T08:00:00Z",
    };
    respostaHttp(perfilApi);

    await expect(adminService.perfil(controlador.signal)).resolves.toEqual(perfilApi);
    expect(http).toHaveBeenCalledWith("/admin/perfil", { sinal: controlador.signal });
  });

  test("salvarPerfil envia PUT /admin/perfil e atualiza o nome na sessão com formato JWT aceito", async () => {
    gravar("sessao", {
      token: TOKEN_FORMATO_JWT,
      tipo: "Bearer",
      usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" },
    });
    const dados = { nome: "Marina Costa", funcao: "Curadoria", telefone: "(81) 90000-0000" };
    const resposta = { nome: "Marina Costa", atualizadoEm: "2026-10-17T10:00:00Z" };
    respostaHttp(resposta);

    await expect(adminService.salvarPerfil(dados)).resolves.toEqual(resposta);
    expect(http).toHaveBeenCalledWith("/admin/perfil", { metodo: "PUT", corpo: dados });
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Marina Costa");
  });

  test("salvarPerfil não cria sessão quando não há sessão ativa", async () => {
    const dados = { nome: "Marina Costa", funcao: "Curadoria", telefone: "" };
    respostaHttp({ nome: "Marina Costa", atualizadoEm: "2026-10-17T10:00:00Z" });

    await expect(adminService.salvarPerfil(dados)).resolves.toMatchObject({ nome: "Marina Costa" });
    expect(lerGravado("sessao")).toBeNull();
  });

  test("salvarPerfil propaga erro 400 e não altera a sessão", async () => {
    gravar("sessao", {
      token: TOKEN_FORMATO_JWT,
      tipo: "Bearer",
      usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" },
    });
    erroHttp(400, "Informe o nome de quem administra.");

    await expect(
      adminService.salvarPerfil({ nome: "   ", funcao: "", telefone: "" }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Informe o nome de quem administra.",
    });
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Equipe Origem");
  });
});

describe("alterarSenha", () => {
  test("confirmação diferente lança ApiError 400 sem chamar a API", () => {
    let capturado: unknown;
    try {
      adminService.alterarSenha({
        senhaAtual: "origem123",
        novaSenha: "SenhaNova123",
        confirmacao: "SenhaNova124",
      });
    } catch (erro) {
      capturado = erro;
    }

    expect(capturado).toBeInstanceOf(ApiError);
    expect(capturado).toMatchObject({ status: 400, message: "As senhas não coincidem." });
    expect(http).not.toHaveBeenCalled();
  });

  test("quando as senhas coincidem, envia PUT /admin/senha e não grava senhas no navegador", async () => {
    const dados = {
      senhaAtual: "origem123",
      novaSenha: "SenhaNova123",
      confirmacao: "SenhaNova123",
    };
    const resposta = { mensagem: "Senha alterada. Use a nova senha no próximo acesso." };
    respostaHttp(resposta);

    await expect(adminService.alterarSenha(dados)).resolves.toEqual(resposta);
    expect(http).toHaveBeenCalledWith("/admin/senha", { metodo: "PUT", corpo: dados });
    expect(tudoGravado()).not.toContain("SenhaNova123");
    expect(tudoGravado()).not.toContain("origem123");
  });

  test.each([
    [400, "senha atual vazia", { senhaAtual: "", novaSenha: "SenhaNova123", confirmacao: "SenhaNova123" }, "Informe a senha atual."],
    [400, "nova com 7 caracteres", { senhaAtual: "origem123", novaSenha: "1234567", confirmacao: "1234567" }, "Use pelo menos 8 caracteres."],
    [401, "senha atual incorreta", { senhaAtual: "errada123", novaSenha: "SenhaNova123", confirmacao: "SenhaNova123" }, "Senha atual incorreta."],
  ])("propaga erro %i da API (%s)", async (status, _caso, dados, mensagem) => {
    erroHttp(status, mensagem);

    await expect(adminService.alterarSenha(dados)).rejects.toMatchObject({
      status,
      message: mensagem,
    });
    expect(http).toHaveBeenCalledWith("/admin/senha", { metodo: "PUT", corpo: dados });
  });
});
