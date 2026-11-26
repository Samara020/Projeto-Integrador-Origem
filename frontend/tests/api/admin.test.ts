// RBAC e endpoints administrativos reais com JWT e Postgres.
import { get, post, put, registrarELogar } from "./cliente";

type Pendente = {
  id: string;
  nome: string;
  artesao: { id: string; nome: string };
  statusValidacao: string;
};
type Sinalizada = { id: string; status: string; motivo: string; produto: { id: string } };

describe("TC24 · RBAC e endpoints administrativos (backend real)", () => {
  let adminToken: string;
  let adminEmail: string;
  let adminSenha: string;
  let compradorToken: string;
  let pendenteId: string;

  beforeAll(async () => {
    const admin = await registrarELogar("ADMINISTRADOR");
    adminToken = admin.token;
    adminEmail = admin.email;
    adminSenha = admin.senha;

    const comprador = await registrarELogar("COMPRADOR");
    compradorToken = comprador.token;

    const artesao = await registrarELogar("ARTESAO");
    const criado = await post<{ id: string }>(
      "/produtos",
      {
        nome: `Pendente Admin ${Date.now()}`,
        descricao: "Peça criada para aparecer na fila de validação admin.",
        categoria: "Cerâmica",
        tecnica: "Cerâmica manual",
        origem: "Caruaru, PE",
        preco: 140,
        modalidadeProducao: "PRONTA_ENTREGA",
        estoque: 2,
        imagens: ["/produtos/vaso-ceramica.jpg"],
      },
      { token: artesao.token },
    );
    pendenteId = String(criado.corpo.id);
  });

  test("rotas admin recusam anônimo (401) e comprador (403)", async () => {
    const anon = await get("/painel/admin/painel/metricas");
    const comp = await get("/painel/admin/painel/metricas", { token: compradorToken });

    expect(anon.status).toBe(401);
    expect(comp.status).toBe(403);
  });

  test("GET /produtos/admin/produtos/pendentes lista fila e filtra ?status=PENDENTE", async () => {
    const todas = await get<{ total: number; itens: Pendente[] }>(
      "/produtos/admin/produtos/pendentes",
      { token: adminToken },
    );
    const pendentes = await get<{ total: number; itens: Pendente[] }>(
      "/produtos/admin/produtos/pendentes?status=PENDENTE",
      { token: adminToken },
    );

    expect(todas.status).toBe(200);
    expect(todas.corpo.total).toBe(todas.corpo.itens.length);
    expect(pendentes.status).toBe(200);
    expect(pendentes.corpo.itens.every((p) => p.statusValidacao === "PENDENTE")).toBe(true);
    expect(pendentes.corpo.itens.some((p) => p.id === pendenteId)).toBe(true);
  });

  test("GET /avaliacoes/admin/avaliacoes?status=EM_MODERACAO retorna 200", async () => {
    const { status, corpo } = await get<{ total: number; itens: Sinalizada[] }>(
      "/avaliacoes/admin/avaliacoes?status=EM_MODERACAO",
      { token: adminToken },
    );

    expect(status).toBe(200);
    expect(typeof corpo.total).toBe("number");
    expect(Array.isArray(corpo.itens)).toBe(true);
  });

  test("GET e PUT /painel/admin/perfil persistem nome, função e telefone", async () => {
    const inicial = await get<{ nome: string; email: string; funcao: string; telefone: string }>(
      "/painel/admin/perfil",
      { token: adminToken },
    );
    expect(inicial.status).toBe(200);
    expect(inicial.corpo.email).toBe(adminEmail);

    const novoNome = `Admin Atualizado ${Date.now()}`;
    const salvo = await put<{ nome: string }>(
      "/painel/admin/perfil",
      { nome: novoNome, funcao: "Curadoria PE", telefone: "(81) 99999-0001" },
      { token: adminToken },
    );
    expect(salvo.status).toBe(200);
    expect(salvo.corpo.nome).toBe(novoNome);

    const depois = await get<{ nome: string; funcao: string; telefone: string }>(
      "/painel/admin/perfil",
      { token: adminToken },
    );
    expect(depois.corpo).toMatchObject({
      nome: novoNome,
      funcao: "Curadoria PE",
      telefone: "(81) 99999-0001",
    });
  });

  test("PUT /painel/admin/senha valida senhaAtual e persiste nova senha no login", async () => {
    const errada = await put(
      "/painel/admin/senha",
      { senhaAtual: "Errada123", novaSenha: "NovaSenha123", confirmacao: "NovaSenha123" },
      { token: adminToken },
    );
    expect(errada.status).toBe(401);

    const ok = await put(
      "/painel/admin/senha",
      { senhaAtual: adminSenha, novaSenha: "NovaSenha123", confirmacao: "NovaSenha123" },
      { token: adminToken },
    );
    expect(ok.status).toBe(200);

    const loginAntigo = await post("/auth/login", { email: adminEmail, senha: adminSenha });
    const loginNovo = await post<{ token: string }>("/auth/login", {
      email: adminEmail,
      senha: "NovaSenha123",
    });
    expect(loginAntigo.status).toBe(401);
    expect(loginNovo.status).toBe(200);
    expect(loginNovo.corpo.token).toBeTruthy();
  });

  test("GET /painel/admin/painel/metricas retorna totais reais positivos", async () => {
    const { status, corpo } = await get<{
      totalUsuarios: number;
      totalArtesaos: number;
      validacoesPendentes: number;
    }>("/painel/admin/painel/metricas", { token: adminToken });

    expect(status).toBe(200);
    expect(corpo.totalUsuarios).toBeGreaterThan(0);
    expect(corpo.totalArtesaos).toBeGreaterThan(0);
    expect(corpo.validacoesPendentes).toBeGreaterThanOrEqual(1);
  });
});

// HU-16, critério "Ação auditável": suspender e reativar exigem justificativa e registram
// responsável, data e resultado. Aqui a prova é pela API, de fora: o que a rota responde e o
// efeito no login e na sessão. A linha de auditoria no banco é conferida na suíte do backend
// (backend/app/tests/admin-def04.test.ts), porque ainda não há rota que leia o histórico.
describe("TC24 · suspensão e reativação de cadastro (backend real)", () => {
  type Acao = { id: string; situacao: string; acao: string; justificativa: string; responsavelId: string; realizadaEm: string };
  type Metricas = { usuariosCadastrados: { id: string; situacao: string }[] };

  let admin: Awaited<ReturnType<typeof registrarELogar>>;

  beforeAll(async () => {
    admin = await registrarELogar("ADMINISTRADOR");
  });

  const suspender = (id: string, corpo: unknown, token?: string) =>
    put<Acao & { mensagem?: string }>(`/admin/usuarios/${id}/suspensao`, corpo, { token });
  const reativar = (id: string, corpo: unknown, token?: string) =>
    put<Acao & { mensagem?: string }>(`/admin/usuarios/${id}/reativacao`, corpo, { token });
  const situacaoNoPainel = async (id: string) => {
    const painel = await get<Metricas>("/admin/painel/metricas", { token: admin.token });
    return painel.corpo.usuariosCadastrados.find((usuario) => usuario.id === id)?.situacao;
  };

  test("suspender derruba a sessão e o login; reativar devolve o acesso com login novo", async () => {
    const comprador = await registrarELogar("COMPRADOR");
    const id = String(comprador.usuario.id);
    expect((await get("/comprador/pedidos", { token: comprador.token })).status).toBe(200);
    const antes = Date.now();

    const suspensao = await suspender(id, { justificativa: "Denúncias de pedido não entregue." }, admin.token);

    expect(suspensao.status).toBe(200);
    expect(suspensao.corpo).toMatchObject({
      id,
      situacao: "SUSPENSO",
      acao: "SUSPENDER",
      justificativa: "Denúncias de pedido não entregue.",
      responsavelId: String(admin.usuario.id),
    });
    expect(Math.abs(new Date(suspensao.corpo.realizadaEm).getTime() - antes)).toBeLessThan(60_000);
    expect(await situacaoNoPainel(id)).toBe("SUSPENSO");

    const sessaoAntiga = await get<{ mensagem: string }>("/comprador/pedidos", { token: comprador.token });
    expect(sessaoAntiga.status).toBe(401);
    expect(sessaoAntiga.corpo).toEqual({ mensagem: "Sessão encerrada. Faça login novamente." });

    const loginSuspenso = await post<{ mensagem: string; token?: string }>("/auth/login", { email: comprador.email, senha: comprador.senha });
    expect(loginSuspenso.status).toBe(403);
    expect(loginSuspenso.corpo).toEqual({ mensagem: "Esta conta está suspensa. Fale com o suporte da Origem." });

    const reativacao = await reativar(id, { justificativa: "Pendência resolvida com o comprador." }, admin.token);

    expect(reativacao.status).toBe(200);
    expect(reativacao.corpo).toMatchObject({ id, situacao: "ATIVO", acao: "REATIVAR", responsavelId: String(admin.usuario.id) });
    expect(await situacaoNoPainel(id)).toBe("ATIVO");

    const loginNovo = await post<{ token: string }>("/auth/login", { email: comprador.email, senha: comprador.senha });
    expect(loginNovo.status).toBe(200);
    expect((await get("/comprador/pedidos", { token: loginNovo.corpo.token })).status).toBe(200);
    // O token de antes da suspensão não volta a valer.
    expect((await get("/comprador/pedidos", { token: comprador.token })).status).toBe(401);
  });

  test("justificativa ausente, vazia ou só com espaços responde 400 e a conta segue ativa", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const id = String(artesao.usuario.id);

    for (const corpo of [{}, { justificativa: "" }, { justificativa: "   " }]) {
      const resposta = await suspender(id, corpo, admin.token);
      expect(resposta.status).toBe(400);
      expect(resposta.corpo.mensagem).toBe("Informe a justificativa da ação.");
    }

    expect(await situacaoNoPainel(id)).toBe("ATIVO");
    expect((await post("/auth/login", { email: artesao.email, senha: artesao.senha })).status).toBe(200);
  });

  test("sem token responde 401, comprador e artesão respondem 403, e ninguém é suspenso", async () => {
    const comprador = await registrarELogar("COMPRADOR");
    const artesao = await registrarELogar("ARTESAO");
    const corpo = { justificativa: "Tentativa sem permissão." };
    const alvo = String(artesao.usuario.id);

    expect((await suspender(alvo, corpo)).status).toBe(401);
    expect((await reativar(alvo, corpo)).status).toBe(401);
    expect((await suspender(alvo, corpo, comprador.token)).status).toBe(403);
    expect((await reativar(alvo, corpo, comprador.token)).status).toBe(403);
    expect((await suspender(String(comprador.usuario.id), corpo, artesao.token)).status).toBe(403);

    expect(await situacaoNoPainel(alvo)).toBe("ATIVO");
    expect(await situacaoNoPainel(String(comprador.usuario.id))).toBe("ATIVO");
  });

  test("cadastro inexistente responde 404; repetir a ação ou suspender a si mesmo responde 409", async () => {
    const comprador = await registrarELogar("COMPRADOR");
    const id = String(comprador.usuario.id);
    const corpo = { justificativa: "Conferência das transições proibidas." };

    expect((await suspender("999999999", corpo, admin.token)).status).toBe(404);
    expect((await reativar("999999999", corpo, admin.token)).status).toBe(404);

    expect((await reativar(id, corpo, admin.token)).status).toBe(409);
    expect((await suspender(id, corpo, admin.token)).status).toBe(200);
    expect((await suspender(id, corpo, admin.token)).status).toBe(409);

    const aSiMesmo = await suspender(String(admin.usuario.id), corpo, admin.token);
    expect(aSiMesmo.status).toBe(409);
    expect((await get("/admin/painel/metricas", { token: admin.token })).status).toBe(200);
  });
});

