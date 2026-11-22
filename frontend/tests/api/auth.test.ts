// TC01, TC11 e TC08 no nível de API real: POST /auth/register, /auth/login e recuperação.
import { ADMIN_INVITE_CODE, emailUnico, erro, post, registrarELogar, type SessaoApi } from "./cliente";

type UsuarioCriado = { id: string; nome: string; email: string; papel: string; criadoEm: string };

const JWT_REGEX = /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/;

describe("TC01 · cadastro e login com JWT real", () => {
  test.each(["COMPRADOR", "ARTESAO", "ADMINISTRADOR"] as const)(
    "%s cadastra e entra com 200 retornando JWT assinado",
    async (papel) => {
      const conta = await registrarELogar(papel);

      expect(conta.tipo).toBe("Bearer");
      expect(conta.usuario.papel).toBe(papel);
      expect(conta.usuario.id).toMatch(/^\d+$/);
      expect(conta.token).toMatch(JWT_REGEX);
      const respostaPublica = { token: conta.token, tipo: conta.tipo, usuario: conta.usuario };
      expect(JSON.stringify(respostaPublica)).not.toContain(conta.senha);
    },
  );

  test("e-mail com maiúscula e espaço nas pontas também entra", async () => {
    const conta = await registrarELogar("COMPRADOR");
    const { status, corpo } = await post<SessaoApi>("/auth/login", {
      email: `  ${conta.email.toUpperCase()}  `,
      senha: conta.senha,
    });

    expect(status).toBe(200);
    expect(corpo.usuario.id).toBe(conta.usuario.id);
    expect(corpo.token).toMatch(JWT_REGEX);
  });
});

describe("TC11 · login com credenciais inválidas", () => {
  test("senha errada e e-mail não cadastrado retornam 401 sem token", async () => {
    const conta = await registrarELogar("COMPRADOR");

    const senhaErrada = await post("/auth/login", { email: conta.email, senha: "errada123" });
    const naoExiste = await post("/auth/login", { email: emailUnico("ninguem"), senha: conta.senha });

    expect(senhaErrada.status).toBe(401);
    expect(senhaErrada.corpo).toEqual(erro("E-mail ou senha incorretos."));
    expect(naoExiste.status).toBe(401);
    expect(naoExiste.corpo).toEqual(erro("E-mail ou senha incorretos."));
  });

  test.each([
    ["sem senha", { email: "comprador@origem.dev" }],
    ["sem e-mail", { senha: "SenhaTeste123" }],
    ["corpo vazio", {}],
  ])("%s: 400", async (_caso, dados) => {
    const { status, corpo } = await post("/auth/login", dados);

    expect(status).toBe(400);
    expect(corpo).toEqual(erro("Informe e-mail e senha."));
  });
});

describe("cadastro de conta (POST /auth/register)", () => {
  const novo = (extra: Record<string, unknown> = {}) => ({
    nome: "Pessoa de Teste",
    email: emailUnico("cadastro"),
    senha: "Senha1234",
    papel: "COMPRADOR",
    ...extra,
  });

  test("comprador novo: 201 com id numérico em string, papel e e-mail normalizado, sem senha", async () => {
    const emailBase = emailUnico("nova");
    const { status, corpo } = await post<UsuarioCriado>(
      "/auth/register",
      novo({ email: ` ${emailBase.toUpperCase()} ` }),
    );

    expect(status).toBe(201);
    expect(corpo).toMatchObject({ nome: "Pessoa de Teste", email: emailBase, papel: "COMPRADOR" });
    expect(corpo.id).toMatch(/^\d+$/);
    expect(JSON.stringify(corpo)).not.toContain("Senha1234");
  });

  test("senha com 7 caracteres é recusada e com 8 passa (valor-limite)", async () => {
    const curta = await post("/auth/register", novo({ senha: "1234567" }));
    const exata = await post("/auth/register", novo({ senha: "12345678" }));

    expect(curta.status).toBe(400);
    expect(curta.corpo).toEqual(erro("A senha precisa ter pelo menos 8 caracteres."));
    expect(exata.status).toBe(201);
  });

  test.each([
    ["nome", "Informe um nome válido com pelo menos 2 caracteres."],
    ["email", "Informe um endereço de e-mail válido."],
    ["senha", "A senha precisa ter pelo menos 8 caracteres."],
  ])("sem %s: 400", async (campo, mensagemEsperada) => {
    const dados: Record<string, unknown> = novo();
    delete dados[campo];

    const { status, corpo } = await post("/auth/register", dados);

    expect(status).toBe(400);
    expect(corpo).toEqual(erro(mensagemEsperada));
  });

  test("papel fora do contrato: 400", async () => {
    const { status } = await post("/auth/register", novo({ papel: "SUPERUSUARIO" }));
    expect(status).toBe(400);
  });

  test("e-mail duplicado: 400", async () => {
    const existente = await registrarELogar("COMPRADOR");
    const { status, corpo } = await post("/auth/register", novo({ email: existente.email }));

    expect(status).toBe(400);
    expect(corpo).toEqual(erro("Já existe uma conta com esse e-mail."));
  });
});

describe("TC08 · conta de administrador exige código de convite", () => {
  const adminPayload = (codigoConvite?: string) => ({
    nome: "Admin de Teste",
    email: emailUnico("admin"),
    senha: "SenhaAdmin123",
    papel: "ADMINISTRADOR",
    codigoConvite,
  });

  test.each([
    ["sem código", undefined],
    ["com código errado", "CODIGO-INVALIDO-999"],
  ])("%s: 403", async (_caso, codigo) => {
    const { status, corpo } = await post("/auth/register", adminPayload(codigo));

    expect(status).toBe(403);
    expect(corpo).toEqual(erro("Código de convite inválido."));
  });

  test("com o código válido: 201", async () => {
    const { status, corpo } = await post<UsuarioCriado>(
      "/auth/register",
      adminPayload(`  ${ADMIN_INVITE_CODE} `),
    );

    expect(status).toBe(201);
    expect(corpo.papel).toBe("ADMINISTRADOR");
  });
});

describe("recuperação e redefinição de senha", () => {
  test("POST /auth/redefinir-senha rejeita token inválido com 400", async () => {
    const { status } = await post("/auth/redefinir-senha", {
      token: "token-invalido-inexistente-123456",
      senha: "NovaSenha123",
    });

    expect(status).toBe(400);
  });
});
