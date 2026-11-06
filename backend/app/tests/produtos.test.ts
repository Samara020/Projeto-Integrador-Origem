import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import { hash } from "bcryptjs";
import jwt from "jsonwebtoken";

const app = criarApp();

async function limparBanco() {
  await prisma.mensagemTicket.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.enderecoEntrega.deleteMany();
  await prisma.itemCarrinho.deleteMany();
  await prisma.carrinho.deleteMany();
  await prisma.estoque.deleteMany();
  await prisma.imagem.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.loja.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.perfilAdmin.deleteMany();
}

function gerarToken(id: string, papel: string): string {
  return jwt.sign({ id, papel }, process.env.JWT_SECRET ?? "test_secret", {
    expiresIn: "1h",
  });
}

async function criarUsuarioArtesao(override: any = {}) {
  return prisma.usuario.create({
    data: {
      email: override.email ?? `artesao${Date.now()}@test.com`,
      senha: await hash("senha123", 10),
      nome: override.nome ?? "Artesão Teste",
      papel: "ARTESAO",
      telefone: "11999999999",
      ...override,
    },
  });
}

async function criarUsuarioComprador(override: any = {}) {
  return prisma.usuario.create({
    data: {
      email: override.email ?? `comprador${Date.now()}@test.com`,
      senha: await hash("senha123", 10),
      nome: override.nome ?? "Comprador Teste",
      papel: "COMPRADOR",
      telefone: "11888888888",
      ...override,
    },
  });
}

async function criarCategoria(nome = "Cerâmica") {
  return prisma.categoria.create({ data: { nome, descricao: "Peças de barro" } });
}

async function criarLoja(usuarioId: string, nome = "Loja Teste") {
  return prisma.loja.create({ data: { nome, usuarioId } });
}

async function criarProduto(categoriaId: string, lojaId: string, override: any = {}) {
  return prisma.produto.create({
    data: {
      nome: override.nome ?? "Vaso de Teste",
      descricao: override.descricao ?? "Um vaso bonito",
      tecnica: override.tecnica ?? "Cerâmica",
      origem: override.origem ?? "Zona da Mata",
      preco: override.preco ?? 100,
      modalidadeProducao: override.modalidadeProducao ?? "PRONTA_ENTREGA",
      estoque: override.estoque ?? 10,
      pecaUnica: override.pecaUnica ?? false,
      categoriaId,
      lojaId,
      ...override,
    },
  });
}

describe("Produtos - endpoints e persistência", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  test("GET /produtos retorna envelope paginado só com produtos aprovados", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    await criarProduto(categoria.id, loja.id, { statusValidacao: "APROVADA", nome: "Vaso Aprovado" });
    await criarProduto(categoria.id, loja.id, { statusValidacao: "PENDENTE", nome: "Peça Pendente" });

    const resposta = await request(app).get("/produtos").expect(200);

    expect(resposta.body).toHaveProperty("total");
    expect(resposta.body).toHaveProperty("pagina");
    expect(resposta.body).toHaveProperty("limite");
    expect(resposta.body).toHaveProperty("itens");
    expect(resposta.body.itens.length).toBe(1);
    expect(resposta.body.itens[0].nome).toBe("Vaso Aprovado");
    expect(resposta.body.itens[0]).toHaveProperty("imagemPrincipal");
    expect(resposta.body.itens[0]).toHaveProperty("seloAtivo");
    expect(resposta.body.itens[0]).toHaveProperty("regiao");
    expect(resposta.body.itens[0]).toHaveProperty("disponibilidade");
  });

  test("GET /produtos filtro por termo", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    await criarProduto(categoria.id, loja.id, { statusValidacao: "APROVADA", nome: "Vaso Cerâmica Raízes" });
    await criarProduto(categoria.id, loja.id, { statusValidacao: "APROVADA", nome: "Toalha Bordada" });

    const resposta = await request(app).get("/produtos?termo=vaso").expect(200);

    expect(resposta.body.total).toBe(1);
    expect(resposta.body.itens[0].nome).toBe("Vaso Cerâmica Raízes");
  });

  test("GET /produtos filtro por categoria", async () => {
    const catCeramica = await criarCategoria("Cerâmica");
    const catBordado = await criarCategoria("Bordado");
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    await criarProduto(catCeramica.id, loja.id, { statusValidacao: "APROVADA", nome: "Vaso" });
    await criarProduto(catBordado.id, loja.id, { statusValidacao: "APROVADA", nome: "Toalha" });

    const resposta = await request(app).get(`/produtos?categoria=${catCeramica.nome}`).expect(200);

    expect(resposta.body.total).toBe(1);
    expect(resposta.body.itens[0].nome).toBe("Vaso");
  });

  test("GET /produtos/:id retorna detalhe completo", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    const produto = await criarProduto(categoria.id, loja.id, {
      statusValidacao: "APROVADA",
      dimensoes: "22 × 14 cm",
      material: "Barro",
    });

    const resposta = await request(app).get(`/produtos/${produto.id}`).expect(200);

    expect(resposta.body.id).toBe(produto.id);
    expect(resposta.body.nome).toBe("Vaso de Teste");
    expect(resposta.body.descricao).toBe("Um vaso bonito");
    expect(resposta.body.tecnica).toBe("Cerâmica");
    expect(resposta.body.dimensoes).toBe("22 × 14 cm");
    expect(resposta.body.material).toBe("Barro");
    expect(resposta.body.estoque).toBeGreaterThanOrEqual(0);
    expect(resposta.body.totalAvaliacoes).toBeDefined();
    expect(resposta.body.imagens).toBeDefined();
    expect(resposta.body.categoria).toHaveProperty("id");
    expect(resposta.body.categoria).toHaveProperty("nome");
    expect(resposta.body.artesao).toHaveProperty("id");
    expect(resposta.body.artesao).toHaveProperty("nome");
    expect(resposta.body.regiao).toHaveProperty("id");
    expect(resposta.body.regiao).toHaveProperty("nome");
  });

  test("GET /produtos/:id inexistente retorna 404", async () => {
    await request(app).get("/produtos/id-que-nao-existe").expect(404);
  });

  test("POST /produtos cria produto e persiste no banco", async () => {
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);
    const categoria = await criarCategoria();
    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .post("/produtos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Novo Produto",
        descricao: "Descrição do novo produto",
        categoria: categoria.nome,
        tecnica: "Cerâmica",
        origem: "Agreste",
        preco: 150,
        modalidadeProducao: "PECA_UNICA",
        estoque: 1,
        imagens: ["https://exemplo.com/foto.jpg"],
        dimensoes: "20 × 15 cm",
        material: "Barro",
      })
      .expect(201);

    expect(resposta.body.id).toBeDefined();
    expect(resposta.body.sku).toBeDefined();
    expect(resposta.body.statusValidacao).toBe("PENDENTE");

    // Verifica persistência no banco
    const persistido = await prisma.produto.findUnique({ where: { id: resposta.body.id } });
    expect(persistido).not.toBeNull();
    expect(persistido!.nome).toBe("Novo Produto");
    expect(persistido!.lojaId).toBe(loja.id);
    expect(persistido!.categoriaId).toBe(categoria.id);
  });

  test("POST /produtos sem autenticação retorna 401", async () => {
    await request(app)
      .post("/produtos")
      .send({ nome: "X", categoria: "C", tecnica: "T", origem: "O", preco: 10, modalidadeProducao: "PRONTA_ENTREGA", estoque: 1 })
      .expect(401);
  });

  test("POST /produtos comprador não pode criar (403)", async () => {
    const comprador = await criarUsuarioComprador();
    const token = gerarToken(comprador.id, "COMPRADOR");

    await request(app)
      .post("/produtos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "X", categoria: "C", tecnica: "T", origem: "O", preco: 10, modalidadeProducao: "PRONTA_ENTREGA", estoque: 1 })
      .expect(403);
  });

  test("GET /produtos/recomendacoes retorna lista", async () => {
    const resposta = await request(app)
      .get("/produtos/recomendacoes?produtoId=qualquer")
      .expect(200);
    expect(resposta.body).toHaveProperty("produtosRecomendados");
  });

  test("GET /produtos/comparar retorna produtos comparados", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    const p1 = await criarProduto(categoria.id, loja.id, { statusValidacao: "APROVADA", nome: "Produto A", preco: 100 });
    const p2 = await criarProduto(categoria.id, loja.id, { statusValidacao: "APROVADA", nome: "Produto B", preco: 200 });

    const resposta = await request(app)
      .get(`/produtos/comparar?ids=${p1.id},${p2.id}`)
      .expect(200);

    expect(resposta.body.produtosComparados).toHaveLength(2);
    expect(resposta.body.produtosComparados[0].tecnica).toBeDefined();
  });
});
