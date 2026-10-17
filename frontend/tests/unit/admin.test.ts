import { ApiError } from "@/lib/http";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import type { AvaliacaoSinalizada, PecaPendente, Sessao } from "@/types";
import { concluir, gravar, lerGravado } from "./apoio";

const peca = (id: string, statusValidacao: PecaPendente["statusValidacao"] = "PENDENTE"): PecaPendente => ({
  id, nome: `Peça ${id}`, imagemPrincipal: "/produtos/vaso-ceramica.jpg", artesao: { id: "usr_906", nome: "Zefa do Pajeú" },
  tecnica: "Cerâmica", regiao: "Sertão do Pajeú", enviadoEm: "2026-10-14T09:00:00Z", informacoesOrigem: "Barro do Pajeú.",
  certificado: null, statusValidacao, justificativa: null, decididoEm: null,
});
const avaliacao = (id: string): AvaliacaoSinalizada => ({
  id, produto: { id: "prd_201", nome: "Vaso Cerâmica Raízes", imagemPrincipal: "/produtos/vaso-ceramica.jpg" }, autor: "Carlos Mendes",
  nota: 4, comentario: "Me chama no zap.", criadoEm: "2026-10-16T18:10:00Z", motivo: "LINK_OU_CONTATO", sinalizadaEm: "2026-10-16T18:10:05Z",
  status: "EM_MODERACAO", moderadaEm: null,
});
// O jsdom não traz `fetch`: o mock entra direto no global (jest.spyOn exigiria a propriedade existir)
// e o original volta depois de cada teste.
const fetchOriginal = global.fetch;
const respostaHttp = (corpo: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => corpo } as Response);
};
// Tudo que está no localStorage, numa string só (Object.values no Storage do jsdom não é confiável).
const tudoGravado = () =>
  Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.getItem(window.localStorage.key(i) ?? "") ?? "").join(" ");

beforeEach(() => { jest.useFakeTimers(); window.localStorage.clear(); });
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (fetchOriginal) global.fetch = fetchOriginal;
  else delete (global as { fetch?: unknown }).fetch;
});

describe("validarPeca", () => {
  test("reprovar sem justificativa: 400 e nada gravado", async () => {
    const tentativa = concluir(adminService.validarPeca("prd_401", { status: "REPROVADA", justificativa: "curta" }));
    await expect(tentativa).rejects.toBeInstanceOf(ApiError);
    await expect(tentativa).rejects.toMatchObject({ status: 400, message: "Explique o motivo da reprovação em pelo menos 10 caracteres." });
    expect(lerGravado("admin:validacoes")).toBeNull();
  });
  test("aprovar grava a decisão e ativa o selo", async () => {
    await expect(concluir(adminService.validarPeca("prd_401", { status: "APROVADA", justificativa: "" })))
      .resolves.toEqual({ id: "prd_401", statusValidacao: "APROVADA", seloAtivo: true });
    expect(lerGravado<Record<string, { status: string }>>("admin:validacoes")?.prd_401).toMatchObject({ status: "APROVADA" });
  });
  test("segunda decisão na mesma peça: 409 e a primeira fica", async () => {
    await concluir(adminService.validarPeca("prd_401", { status: "APROVADA", justificativa: "" }));
    await expect(concluir(adminService.validarPeca("prd_401", { status: "REPROVADA", justificativa: "Fotos de produto industrial." })))
      .rejects.toMatchObject({ status: 409, message: "Esta peça já foi avaliada." });
    expect(lerGravado<Record<string, { status: string }>>("admin:validacoes")?.prd_401.status).toBe("APROVADA");
  });
});

describe("pecasPendentes aplica as decisões locais", () => {
  test("peça aprovada no navegador sai de PENDENTE e entra em APROVADA", async () => {
    gravar("admin:validacoes", { prd_401: { status: "APROVADA", justificativa: "", decididoEm: "2026-10-17T10:00:00Z" } });
    respostaHttp({ total: 2, itens: [peca("prd_401"), peca("prd_402")] });
    expect((await adminService.pecasPendentes("PENDENTE")).itens.map((p) => p.id)).toEqual(["prd_402"]);
    const aprovadas = await adminService.pecasPendentes("APROVADA");
    expect(aprovadas.total).toBe(1);
    expect(aprovadas.itens[0]).toMatchObject({ id: "prd_401", statusValidacao: "APROVADA", decididoEm: "2026-10-17T10:00:00Z" });
  });
  test("metricas desconta as decisões locais, sem ficar negativo", async () => {
    gravar("admin:validacoes", { prd_401: { status: "APROVADA", justificativa: "", decididoEm: "x" }, prd_402: { status: "REPROVADA", justificativa: "Sem registro do processo.", decididoEm: "x" } });
    respostaHttp({ validacoesPendentes: 1, denunciasPendentes: 3 });
    await expect(adminService.metricas()).resolves.toMatchObject({ validacoesPendentes: 0, denunciasPendentes: 3 });
  });
});

describe("moderarAvaliacao", () => {
  test("REMOVER devolve REMOVIDO e MANTER devolve PUBLICADO", async () => {
    await expect(concluir(adminService.moderarAvaliacao("avl_801", "REMOVER"))).resolves.toEqual({ id: "avl_801", status: "REMOVIDO" });
    await expect(concluir(adminService.moderarAvaliacao("avl_802", "MANTER"))).resolves.toEqual({ id: "avl_802", status: "PUBLICADO" });
  });
  test("moderar duas vezes: 409", async () => {
    await concluir(adminService.moderarAvaliacao("avl_801", "REMOVER"));
    await expect(concluir(adminService.moderarAvaliacao("avl_801", "MANTER"))).rejects.toMatchObject({ status: 409, message: "Esta avaliação já foi moderada." });
    expect(lerGravado<Record<string, { status: string }>>("admin:moderacoes")?.avl_801.status).toBe("REMOVIDO");
  });
});

describe("leituras aplicam o que foi salvo no navegador", () => {
  test("avaliacoesSinalizadas aplica a moderação local", async () => {
    gravar("admin:moderacoes", { avl_801: { status: "REMOVIDO", moderadaEm: "2026-10-17T10:00:00Z" } });
    respostaHttp({ total: 2, itens: [avaliacao("avl_801"), avaliacao("avl_802")] });
    expect((await adminService.avaliacoesSinalizadas("EM_MODERACAO")).itens.map((a) => a.id)).toEqual(["avl_802"]);
    const removidas = await adminService.avaliacoesSinalizadas("REMOVIDO");
    expect(removidas.itens).toHaveLength(1);
    expect(removidas.itens[0]).toMatchObject({ id: "avl_801", status: "REMOVIDO", moderadaEm: "2026-10-17T10:00:00Z" });
  });
  test("perfil() sobrepõe o perfil salvo no navegador", async () => {
    gravar("admin:perfil", { nome: "Marina Costa", funcao: "Curadoria", telefone: "" });
    respostaHttp({ nome: "Equipe Origem", email: "admin@origem.dev", funcao: "Curadoria e moderação", telefone: "", criadoEm: "2026-08-01T08:00:00Z" });
    await expect(adminService.perfil()).resolves.toMatchObject({ nome: "Marina Costa", email: "admin@origem.dev" });
  });
});

describe("salvarPerfil", () => {
  test("nome vazio: 400 e nada gravado", async () => {
    await expect(concluir(adminService.salvarPerfil({ nome: "   ", funcao: "", telefone: "" }))).rejects.toMatchObject({ status: 400, message: "Informe o nome de quem administra." });
    expect(lerGravado("admin:perfil")).toBeNull();
  });
  test("salvar nome atualiza a sessão sem espaços nas pontas", async () => {
    gravar("sessao", { token: "fake.x.1", tipo: "Bearer", usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" } });
    await expect(concluir(adminService.salvarPerfil({ nome: "  Marina Costa  ", funcao: "Curadoria", telefone: "" }))).resolves.toMatchObject({ nome: "Marina Costa" });
    expect(lerGravado<{ nome: string }>("admin:perfil")?.nome).toBe("Marina Costa");
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Marina Costa");
  });
  test("não renomeia a sessão de outro papel", async () => {
    gravar("sessao", { token: "fake.x.1", tipo: "Bearer", usuario: { id: "usr_101", nome: "Joana Compradora", papel: "COMPRADOR" } });
    await expect(concluir(adminService.salvarPerfil({ nome: "Marina Costa", funcao: "", telefone: "" }))).resolves.toMatchObject({ nome: "Marina Costa" });
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Joana Compradora");
    expect(lerGravado<{ nome: string }>("admin:perfil")?.nome).toBe("Marina Costa");
  });
});

describe("alterarSenha", () => {
  test.each([
    ["senha atual vazia", { senhaAtual: "", novaSenha: "SenhaNova123", confirmacao: "SenhaNova123" }, "Informe a senha atual."],
    ["nova com 7 caracteres", { senhaAtual: "origem123", novaSenha: "1234567", confirmacao: "1234567" }, "Use pelo menos 8 caracteres."],
    ["confirmação vazia", { senhaAtual: "origem123", novaSenha: "SenhaNova123", confirmacao: "" }, "Confirme a nova senha."],
    ["confirmação diferente", { senhaAtual: "origem123", novaSenha: "SenhaNova123", confirmacao: "SenhaNova124" }, "As senhas não coincidem."],
  ])("%s: 400", async (_caso, dados, mensagem) => {
    await expect(concluir(adminService.alterarSenha(dados))).rejects.toMatchObject({ status: 400, message: mensagem });
  });
  test("senha válida: mensagem de sucesso e nada gravado", async () => {
    await expect(concluir(adminService.alterarSenha({ senhaAtual: "origem123", novaSenha: "SenhaNova123", confirmacao: "SenhaNova123" })))
      .resolves.toEqual({ mensagem: "Senha conferida. Nesta demonstração a troca não fica gravada; continue entrando com a senha atual." });
    expect(tudoGravado()).not.toContain("SenhaNova123");
    expect(tudoGravado()).not.toContain("origem123");
  });
});

describe("entrar", () => {
  const sessaoDaApi = (papel: Sessao["usuario"]["papel"]): Sessao => ({
    token: "fake.usr_001.1", tipo: "Bearer", usuario: { id: "usr_001", nome: "Equipe Origem", papel },
  });
  test("login do administrador usa o nome salvo no perfil local", async () => {
    gravar("admin:perfil", { nome: "Marina Costa", funcao: "Curadoria", telefone: "" });
    respostaHttp(sessaoDaApi("ADMINISTRADOR"));
    const sessao = await authService.entrar({ email: "admin@origem.dev", senha: "origem123" });
    expect(sessao.usuario.nome).toBe("Marina Costa");
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Marina Costa");
  });
  test("login de comprador mantém o nome da API", async () => {
    gravar("admin:perfil", { nome: "Marina Costa", funcao: "Curadoria", telefone: "" });
    respostaHttp(sessaoDaApi("COMPRADOR"));
    const sessao = await authService.entrar({ email: "comprador@origem.dev", senha: "origem123" });
    expect(sessao.usuario.nome).toBe("Equipe Origem");
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Equipe Origem");
  });
});

describe("gravação recusada pelo navegador", () => {
  const recusar = () =>
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
  test("validarPeca: 507 e nada gravado", async () => {
    recusar();
    await expect(concluir(adminService.validarPeca("prd_401", { status: "APROVADA", justificativa: "" }))).rejects.toMatchObject({ status: 507 });
    expect(lerGravado("admin:validacoes")).toBeNull();
  });
  test("moderarAvaliacao: 507", async () => {
    recusar();
    await expect(concluir(adminService.moderarAvaliacao("avl_801", "REMOVER"))).rejects.toMatchObject({ status: 507 });
  });
  test("salvarPerfil: 507 e a sessão não muda de nome", async () => {
    gravar("sessao", { token: "fake.x.1", tipo: "Bearer", usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" } });
    recusar();
    await expect(concluir(adminService.salvarPerfil({ nome: "Marina Costa", funcao: "", telefone: "" }))).rejects.toMatchObject({ status: 507 });
    expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Equipe Origem");
  });
});
