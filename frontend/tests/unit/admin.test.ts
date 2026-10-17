import { ApiError } from "@/lib/http";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import type { PecaPendente, Sessao } from "@/types";
import { concluir, gravar, lerGravado } from "./apoio";

const peca = (id: string, statusValidacao: PecaPendente["statusValidacao"] = "PENDENTE"): PecaPendente => ({
  id, nome: `Peça ${id}`, imagemPrincipal: "/produtos/vaso-ceramica.jpg", artesao: { id: "usr_906", nome: "Zefa do Pajeú" },
  tecnica: "Cerâmica", regiao: "Sertão do Pajeú", enviadoEm: "2026-10-14T09:00:00Z", informacoesOrigem: "Barro do Pajeú.",
  certificado: null, statusValidacao, justificativa: null, decididoEm: null,
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
    const tentativa = concluir(adminService.validarPeca("prd_301", { status: "REPROVADA", justificativa: "curta" }));
    await expect(tentativa).rejects.toBeInstanceOf(ApiError);
    await expect(tentativa).rejects.toMatchObject({ status: 400, message: "Explique o motivo da reprovação em pelo menos 10 caracteres." });
    expect(lerGravado("admin:validacoes")).toBeNull();
  });
  test("aprovar grava a decisão e ativa o selo", async () => {
    await expect(concluir(adminService.validarPeca("prd_301", { status: "APROVADA", justificativa: "" })))
      .resolves.toEqual({ id: "prd_301", statusValidacao: "APROVADA", seloAtivo: true });
    expect(lerGravado<Record<string, { status: string }>>("admin:validacoes")?.prd_301).toMatchObject({ status: "APROVADA" });
  });
  test("segunda decisão na mesma peça: 409 e a primeira fica", async () => {
    await concluir(adminService.validarPeca("prd_301", { status: "APROVADA", justificativa: "" }));
    await expect(concluir(adminService.validarPeca("prd_301", { status: "REPROVADA", justificativa: "Fotos de produto industrial." })))
      .rejects.toMatchObject({ status: 409, message: "Esta peça já foi avaliada." });
    expect(lerGravado<Record<string, { status: string }>>("admin:validacoes")?.prd_301.status).toBe("APROVADA");
  });
});

describe("pecasPendentes aplica as decisões locais", () => {
  test("peça aprovada no navegador sai de PENDENTE e entra em APROVADA", async () => {
    gravar("admin:validacoes", { prd_301: { status: "APROVADA", justificativa: "", decididoEm: "2026-10-17T10:00:00Z" } });
    respostaHttp({ total: 2, itens: [peca("prd_301"), peca("prd_302")] });
    expect((await adminService.pecasPendentes("PENDENTE")).itens.map((p) => p.id)).toEqual(["prd_302"]);
    const aprovadas = await adminService.pecasPendentes("APROVADA");
    expect(aprovadas.total).toBe(1);
    expect(aprovadas.itens[0]).toMatchObject({ id: "prd_301", statusValidacao: "APROVADA", decididoEm: "2026-10-17T10:00:00Z" });
  });
  test("metricas desconta as decisões locais, sem ficar negativo", async () => {
    gravar("admin:validacoes", { prd_301: { status: "APROVADA", justificativa: "", decididoEm: "x" }, prd_302: { status: "REPROVADA", justificativa: "Sem registro do processo.", decididoEm: "x" } });
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
      .resolves.toEqual({ mensagem: "Senha alterada. Use a nova senha no próximo acesso." });
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
