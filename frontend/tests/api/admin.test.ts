// RBAC e endpoints administrativos reais com JWT e Postgres.
import { get, post, put, registrarELogar } from "./cliente";

type Pendente = {
  id: string;
  nome: string;
  artesao: { id: string; nome: string };
  statusValidacao: string;
};
type Sinalizada = { id: string; status: string; motivo: string; produto: { id: string } };

describe("RBAC e endpoints administrativos (backend real)", () => {
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
