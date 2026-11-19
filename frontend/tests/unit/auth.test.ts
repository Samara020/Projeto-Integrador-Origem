import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import type { DadosCadastro, Sessao, Usuario } from "@/types";
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

const TOKEN_FORMATO_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InVzcl8xMDEifQ.assinaturaFixture";

describe("authService", () => {
  const envOriginal = process.env;

  beforeEach(() => {
    process.env = { ...envOriginal };
    window.localStorage.clear();
    (http as jest.Mock).mockReset();
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  describe("sessaoAtual e sair", () => {
    test("retorna null quando não há sessão salva", () => {
      expect(authService.sessaoAtual()).toBeNull();
    });

    test("retorna a sessão quando o token tem formato JWT compatível", () => {
      const sessao: Sessao = {
        token: TOKEN_FORMATO_JWT,
        tipo: "Bearer",
        usuario: { id: "usr_101", nome: "João Comprador", papel: "COMPRADOR" },
      };
      gravar("sessao", sessao);

      expect(authService.sessaoAtual()).toEqual(sessao);
    });

    test.each([
      "fake.usr_001.1",
      "token-sem-pontos",
      "abc.def.ghi",
      "",
    ])("descarta e remove do localStorage sessão com token legado ou incompatível (%j)", (tokenInvalido) => {
      gravar("sessao", {
        token: tokenInvalido,
        tipo: "Bearer",
        usuario: { id: "usr_001", nome: "Legado", papel: "COMPRADOR" },
      });

      expect(authService.sessaoAtual()).toBeNull();
      expect(window.localStorage.getItem("origem:sessao")).toBeNull();
    });

    test("sair remove a sessão do localStorage", async () => {
      gravar("sessao", {
        token: TOKEN_FORMATO_JWT,
        tipo: "Bearer",
        usuario: { id: "usr_101", nome: "João Comprador", papel: "COMPRADOR" },
      });

      await authService.sair();

      expect(lerGravado("sessao")).toBeNull();
    });
  });

  describe("entrar", () => {
    test("envia POST /auth/login, grava e devolve a sessão retornada pela API", async () => {
      const sessaoApi: Sessao = {
        token: TOKEN_FORMATO_JWT,
        tipo: "Bearer",
        usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" },
      };
      (http as jest.Mock).mockResolvedValueOnce(sessaoApi);

      const sessao = await authService.entrar({ email: "admin@origem.dev", senha: "origem123" });

      expect(http).toHaveBeenCalledWith("/auth/login", {
        metodo: "POST",
        corpo: { email: "admin@origem.dev", senha: "origem123" },
      });
      expect(sessao).toEqual(sessaoApi);
      expect(lerGravado<Sessao>("sessao")).toEqual(sessaoApi);
    });

    test("propaga erro 401 sem gravar sessão", async () => {
      (http as jest.Mock).mockRejectedValueOnce(new ApiError(401, "E-mail ou senha incorretos."));

      await expect(
        authService.entrar({ email: "joao@comprador.com", senha: "errada" }),
      ).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });
      expect(lerGravado("sessao")).toBeNull();
    });
  });

  describe("cadastrar", () => {
    const usuarioCriado: Usuario = {
      id: "1016",
      nome: "Comprador Sucesso",
      email: "sucesso@origem.dev",
      papel: "COMPRADOR",
      criadoEm: "2026-10-17T10:00:00Z",
    };

    const sessaoBackend: Sessao = {
      token: TOKEN_FORMATO_JWT,
      tipo: "Bearer",
      usuario: { id: "1016", nome: "Comprador Sucesso", papel: "COMPRADOR" },
    };

    test("envia POST /auth/register e em seguida POST /auth/login, retornando e gravando a sessão real", async () => {
      const dadosCadastro: DadosCadastro = {
        nome: "Comprador Sucesso",
        email: "sucesso@origem.dev",
        senha: "senhaValida123",
        papel: "COMPRADOR",
      };
      (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
      (http as jest.Mock).mockResolvedValueOnce(sessaoBackend);

      const resultado = await authService.cadastrar(dadosCadastro);

      expect(http).toHaveBeenNthCalledWith(1, "/auth/register", {
        metodo: "POST",
        corpo: dadosCadastro,
      });
      expect(http).toHaveBeenNthCalledWith(2, "/auth/login", {
        metodo: "POST",
        corpo: { email: dadosCadastro.email, senha: dadosCadastro.senha },
      });
      expect(resultado).toEqual(sessaoBackend);
      expect(lerGravado<Sessao>("sessao")).toEqual(sessaoBackend);
    });

    test("se POST /auth/register falhar (ex.: 403 convite inválido), propaga erro sem tentar login nem gravar sessão", async () => {
      (http as jest.Mock).mockRejectedValueOnce(new ApiError(403, "Código de convite inválido."));

      await expect(
        authService.cadastrar({
          nome: "Novo Admin",
          email: "admin@origem.dev",
          senha: "senhaValida123",
          papel: "ADMINISTRADOR",
          codigoConvite: "ERRADO",
        }),
      ).rejects.toMatchObject({ status: 403, message: "Código de convite inválido." });

      expect(http).toHaveBeenCalledTimes(1);
      expect(lerGravado("sessao")).toBeNull();
    });

    test.each([
      ["http://localhost:4000"],
      ["/api"],
      [undefined],
    ])("com NEXT_PUBLIC_API_URL=%s, se login falhar após cadastro, propaga erro e NUNCA cria token fake", async (apiUrl) => {
      if (apiUrl === undefined) {
        delete process.env.NEXT_PUBLIC_API_URL;
      } else {
        process.env.NEXT_PUBLIC_API_URL = apiUrl;
      }

      (http as jest.Mock).mockResolvedValueOnce(usuarioCriado);
      (http as jest.Mock).mockRejectedValueOnce(new ApiError(401, "E-mail ou senha incorretos."));

      await expect(
        authService.cadastrar({
          nome: "Novo Comprador",
          email: "novo@origem.dev",
          senha: "senhaValida123",
          papel: "COMPRADOR",
        }),
      ).rejects.toMatchObject({ status: 401, message: "E-mail ou senha incorretos." });

      expect(http).toHaveBeenCalledTimes(2);
      expect(lerGravado("sessao")).toBeNull();
    });
  });

  describe("atualizarNome", () => {
    test("atualiza o nome na sessão ativa com formato JWT compatível e persiste no localStorage", () => {
      gravar("sessao", {
        token: TOKEN_FORMATO_JWT,
        tipo: "Bearer",
        usuario: { id: "usr_001", nome: "Equipe Origem", papel: "ADMINISTRADOR" },
      });

      const atualizada = authService.atualizarNome("Marina Costa");

      expect(atualizada?.usuario.nome).toBe("Marina Costa");
      expect(lerGravado<Sessao>("sessao")?.usuario.nome).toBe("Marina Costa");
    });

    test("retorna null sem gravar quando não há sessão ou o token tem formato incompatível", () => {
      expect(authService.atualizarNome("Marina Costa")).toBeNull();
      expect(lerGravado("sessao")).toBeNull();

      gravar("sessao", {
        token: "fake.usr_001.1",
        tipo: "Bearer",
        usuario: { id: "usr_001", nome: "Legado", papel: "ADMINISTRADOR" },
      });
      expect(authService.atualizarNome("Marina Costa")).toBeNull();
      expect(lerGravado("sessao")).toBeNull();
    });
  });

  describe("recuperarSenha e redefinirSenha", () => {
    test("recuperarSenha envia POST /auth/recuperar-senha e devolve resposta da API", async () => {
      const resposta = { mensagem: "E-mail de recuperação enviado com sucesso." };
      (http as jest.Mock).mockResolvedValueOnce(resposta);

      await expect(authService.recuperarSenha({ email: "joao@comprador.com" })).resolves.toEqual(resposta);
      expect(http).toHaveBeenCalledWith("/auth/recuperar-senha", {
        metodo: "POST",
        corpo: { email: "joao@comprador.com" },
      });
    });

    test("recuperarSenha propaga erro da API sem fallback silencioso", async () => {
      (http as jest.Mock).mockRejectedValueOnce(new ApiError(500, "Serviço de e-mail indisponível."));

      await expect(authService.recuperarSenha({ email: "joao@comprador.com" })).rejects.toMatchObject({
        status: 500,
        message: "Serviço de e-mail indisponível.",
      });
    });

    test("redefinirSenha envia POST /auth/redefinir-senha e devolve resposta da API", async () => {
      const resposta = { mensagem: "Senha alterada. Entre com a senha nova." };
      (http as jest.Mock).mockResolvedValueOnce(resposta);

      await expect(
        authService.redefinirSenha({ token: "tok_abc", senha: "novaSenha123" }),
      ).resolves.toEqual(resposta);
      expect(http).toHaveBeenCalledWith("/auth/redefinir-senha", {
        metodo: "POST",
        corpo: { token: "tok_abc", senha: "novaSenha123" },
      });
    });

    test("redefinirSenha propaga erro da API (ex.: token expirado)", async () => {
      (http as jest.Mock).mockRejectedValueOnce(new ApiError(400, "O link de recuperação expirou. Peça um novo."));

      await expect(
        authService.redefinirSenha({ token: "", senha: "novaSenha123" }),
      ).rejects.toMatchObject({
        status: 400,
        message: "O link de recuperação expirou. Peça um novo.",
      });
    });
  });
});
