import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import type { Sessao, Usuario } from "@/types";

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

describe("authService · cadastrar e fallback seguro de sessão", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...envOriginal };
    window.localStorage.clear();
    (http as jest.Mock).mockReset();
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  test("em modo backend real (NEXT_PUBLIC_API_URL definido), se entrar falhar após cadastrar, repassa o erro e NUNCA cria token fake", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";

    const usuarioCriado: Usuario = {
      id: "1015",
      nome: "Novo Comprador",
      email: "novo@origem.dev",
      papel: "COMPRADOR",
      criadoEm: new Date().toISOString(),
    };

    (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
    (http as jest.Mock).mockRejectedValueOnce(new ApiError(401, "E-mail ou senha incorretos."));

    await expect(
      authService.cadastrar({
        nome: "Novo Comprador",
        email: "novo@origem.dev",
        senha: "senhaValida123",
        papel: "COMPRADOR",
      }),
    ).rejects.toThrow("E-mail ou senha incorretos.");

    expect(window.localStorage.getItem("origem:sessao")).toBeNull();
  });

  test("quando NEXT_PUBLIC_API_URL está ausente, o transporte padrão aponta para o backend (localhost:4000) e também NUNCA cria token fake", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const usuarioCriado: Usuario = {
      id: "1015",
      nome: "Novo Comprador",
      email: "novo@origem.dev",
      papel: "COMPRADOR",
      criadoEm: new Date().toISOString(),
    };

    (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
    (http as jest.Mock).mockRejectedValueOnce(new ApiError(401, "E-mail ou senha incorretos."));

    await expect(
      authService.cadastrar({
        nome: "Novo Comprador",
        email: "novo@origem.dev",
        senha: "senhaValida123",
        papel: "COMPRADOR",
      }),
    ).rejects.toThrow("E-mail ou senha incorretos.");

    expect(window.localStorage.getItem("origem:sessao")).toBeNull();
  });

  test("SOMENTE quando NEXT_PUBLIC_API_URL === '/api' explicitamente, cria sessão fake de demonstração se entrar falhar", async () => {
    process.env.NEXT_PUBLIC_API_URL = "/api";

    const usuarioCriado: Usuario = {
      id: "usr_999",
      nome: "Comprador Demo",
      email: "demo@origem.dev",
      papel: "COMPRADOR",
      criadoEm: new Date().toISOString(),
    };

    (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
    (http as jest.Mock).mockRejectedValueOnce(new Error("Fake API em memória"));

    const sessao = await authService.cadastrar({
      nome: "Comprador Demo",
      email: "demo@origem.dev",
      senha: "senhaValida123",
      papel: "COMPRADOR",
    });

    expect(sessao.token).toMatch(/^fake\./);
    expect(sessao.usuario.id).toBe("usr_999");
    expect(window.localStorage.getItem("origem:sessao")).not.toBeNull();
  });

  test("em modo backend real com sucesso tanto no registro quanto no login, retorna a sessão real emitida pelo backend", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";

    const usuarioCriado: Usuario = {
      id: "1016",
      nome: "Comprador Sucesso",
      email: "sucesso@origem.dev",
      papel: "COMPRADOR",
      criadoEm: new Date().toISOString(),
    };

    const sessaoBackend: Sessao = {
      token: "jwt.real.valido",
      tipo: "Bearer",
      usuario: { id: "1016", nome: "Comprador Sucesso", papel: "COMPRADOR" },
    };

    (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
    (http as jest.Mock).mockResolvedValueOnce(sessaoBackend);

    const resultado = await authService.cadastrar({
      nome: "Comprador Sucesso",
      email: "sucesso@origem.dev",
      senha: "senhaValida123",
      papel: "COMPRADOR",
    });

    expect(resultado.token).toBe("jwt.real.valido");
    expect(resultado.usuario.papel).toBe("COMPRADOR");
    expect(window.localStorage.getItem("origem:sessao")).toContain("jwt.real.valido");
  });
});
