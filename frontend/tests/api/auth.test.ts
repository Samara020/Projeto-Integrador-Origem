// TC01, TC11 e TC08 no nível de API: POST /api/auth/login e POST /api/auth/register.
import { erro, post } from "./cliente";

type Sessao = { token: string; tipo: string; usuario: { id: string; nome: string; papel: string } };
type Usuario = { id: string; nome: string; email: string; papel: string; criadoEm: string };

const SENHA = "origem123";

describe("TC01 · login com credenciais válidas", () => {
  test.each([
    ["comprador@origem.dev", { id: "usr_101", nome: "Joana Compradora", papel: "COMPRADOR" }],
    ["artesao@origem.dev", { id: "usr_901", nome: "Ana Pereira", papel: "ARTESAO" }],
    ["admin@origem.dev", { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" }],
  ])("%s entra com 200 como a própria conta", async (email, usuario) => {
    const { status, corpo } = await post<Sessao>("/api/auth/login", { email, senha: SENHA });

    expect(status).toBe(200);
    expect(corpo.tipo).toBe("Bearer");
    expect(corpo.usuario).toEqual(usuario);
    // O token carrega o id da mesma conta (fake.<base64 do id>.<instante>).
    expect(corpo.token.split(".")).toEqual(["fake", btoa(usuario.id), expect.stringMatching(/^\d+$/)]);
  });

  test("e-mail com maiúscula e espaço nas pontas também entra", async () => {
    const { status, corpo } = await post<Sessao>("/api/auth/login", { email: "  Comprador@Origem.DEV ", senha: SENHA });

    expect(status).toBe(200);
    expect(corpo.usuario.papel).toBe("COMPRADOR");
  });

  test("a resposta não devolve a senha", async () => {
    const { corpo } = await post("/api/auth/login", { email: "comprador@origem.dev", senha: SENHA });

    expect(JSON.stringify(corpo)).not.toContain(SENHA);
  });
});

describe("TC11 · login com credenciais inválidas", () => {
  test.each([
    ["senha errada", { email: "comprador@origem.dev", senha: "errada123" }],
    ["e-mail não cadastrado", { email: "ninguem@origem.dev", senha: SENHA }],
  ])("%s: 401 sem token", async (_caso, dados) => {
    const { status, corpo } = await post("/api/auth/login", dados);

    expect(status).toBe(401);
    expect(corpo).toEqual(erro("E-mail ou senha incorretos."));
  });

  test.each([
    ["sem senha", { email: "comprador@origem.dev" }],
    ["sem e-mail", { senha: SENHA }],
    ["corpo vazio", {}],
    ["corpo que não é JSON", "isto não é json"],
  ])("%s: 400", async (_caso, dados) => {
    const { status, corpo } = await post("/api/auth/login", dados);

    expect(status).toBe(400);
    expect(corpo).toEqual(erro("Informe e-mail e senha."));
  });
});

describe("cadastro de conta (POST /api/auth/register)", () => {
  const novo = (extra: Record<string, unknown> = {}) => ({
    nome: "Pessoa de Teste",
    email: `teste.${Date.now()}@origem.dev`,
    senha: "12345678",
    papel: "COMPRADOR",
    ...extra,
  });

  test("comprador novo: 201 com id, papel e e-mail normalizado, sem senha", async () => {
    const { status, corpo } = await post<Usuario>("/api/auth/register", novo({ email: " Nova.Pessoa@Origem.dev " }));

    expect(status).toBe(201);
    expect(corpo).toMatchObject({ nome: "Pessoa de Teste", email: "nova.pessoa@origem.dev", papel: "COMPRADOR" });
    expect(corpo.id).toMatch(/^usr_\d{6}$/);
    expect(JSON.stringify(corpo)).not.toContain("12345678");
  });

  test("senha com 7 caracteres é recusada e com 8 passa (valor-limite)", async () => {
    const curta = await post("/api/auth/register", novo({ senha: "1234567" }));
    const exata = await post("/api/auth/register", novo({ senha: "12345678" }));

    expect(curta.status).toBe(400);
    expect(curta.corpo).toEqual(erro("A senha precisa ter pelo menos 8 caracteres."));
    expect(exata.status).toBe(201);
  });

  test.each([["nome"], ["email"], ["senha"]])("sem %s: 400", async (campo) => {
    const dados: Record<string, unknown> = novo();
    delete dados[campo];

    const { status, corpo } = await post("/api/auth/register", dados);

    expect(status).toBe(400);
    expect(corpo).toEqual(erro("Preencha nome, e-mail e senha."));
  });

  test("papel fora do contrato: 400", async () => {
    const { status } = await post("/api/auth/register", novo({ papel: "SUPERUSUARIO" }));

    expect(status).toBe(400);
  });

  test("e-mail que já tem conta: 400", async () => {
    const { status, corpo } = await post("/api/auth/register", novo({ email: "comprador@origem.dev" }));

    expect(status).toBe(400);
    expect(corpo).toEqual(erro("Já existe uma conta com esse e-mail."));
  });
});

describe("TC08 · conta de administrador exige código de convite", () => {
  const admin = (codigoConvite?: string) => ({
    nome: "Admin de Teste",
    email: `admin.${Date.now()}@origem.dev`,
    senha: "12345678",
    papel: "ADMINISTRADOR",
    codigoConvite,
  });

  test.each([
    ["sem código", undefined],
    ["com código errado", "ORIGEM-ADMIN-2025"],
  ])("%s: 403", async (_caso, codigo) => {
    const { status, corpo } = await post("/api/auth/register", admin(codigo));

    expect(status).toBe(403);
    expect(corpo).toEqual(erro("Código de convite inválido."));
  });

  test("com o código certo (sem diferença de caixa e espaço): 201", async () => {
    const { status, corpo } = await post<Usuario>("/api/auth/register", admin("  origem-admin-2026 "));

    expect(status).toBe(201);
    expect(corpo.papel).toBe("ADMINISTRADOR");
  });
});
