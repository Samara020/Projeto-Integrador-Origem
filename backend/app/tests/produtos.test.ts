import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import { validacoes } from "../src/lib/memoria";
import {
  criarCategoria,
  criarLoja,
  criarProduto,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

describe("Produtos - endpoints e persistência", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("GET /produtos retorna envelope paginado só com produtos aprovados", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    await criarProduto(categoria.id, loja.id, { nome: "Vaso Aprovado" });
    const pendente = await criarProduto(categoria.id, loja.id, { nome: "Peça Pendente" });
    validacoes.set(pendente.id, { status: "PENDENTE", seloAtivo: false, justificativa: null, decididoEm: null });

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

    await criarProduto(categoria.id, loja.id, { nome: "Vaso Cerâmica Raízes" });
    await criarProduto(categoria.id, loja.id, { nome: "Toalha Bordada" });

    const resposta = await request(app).get("/produtos?termo=vaso").expect(200);

    expect(resposta.body.total).toBe(1);
    expect(resposta.body.itens[0].nome).toBe("Vaso Cerâmica Raízes");
  });

  test("GET /produtos filtro por categoria", async () => {
    const catCeramica = await criarCategoria("Cerâmica");
    const catBordado = await criarCategoria("Bordado");
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    await criarProduto(catCeramica.id, loja.id, { nome: "Vaso" });
    await criarProduto(catBordado.id, loja.id, { nome: "Toalha" });

    const resposta = await request(app).get(`/produtos?categoria=${catCeramica.nome}`).expect(200);

    expect(resposta.body.total).toBe(1);
    expect(resposta.body.itens[0].nome).toBe("Vaso");
  });

  test("GET /produtos/:id retorna detalhe completo", async () => {
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);

    const produto = await criarProduto(categoria.id, loja.id);

    const resposta = await request(app).get(`/produtos/${produto.id}`).expect(200);

    expect(resposta.body.id).toBe(String(produto.id));
    expect(resposta.body.nome).toBe("Vaso de Teste");
    expect(resposta.body.descricao).toBe("Um vaso bonito");
    expect(resposta.body.tecnica).toBe("Cerâmica");
    expect(resposta.body.estoque).toBe(10);
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
    const persistido = await prisma.produto.findUnique({
      where: { id: Number(resposta.body.id) },
      include: { estoque: true, imagens: true },
    });
    expect(persistido).not.toBeNull();
    expect(persistido!.nome).toBe("Novo Produto");
    expect(persistido!.lojaId).toBe(loja.id);
    expect(persistido!.categoriaId).toBe(categoria.id);
    expect(persistido!.pecaUnica).toBe(true);
    expect(persistido!.estoque!.quantidadeDisponivel).toBe(1);
    expect(persistido!.imagens).toHaveLength(1);
  });

  test("POST /produtos peça única com estoque maior que 1 retorna 400", async () => {
    const artesao = await criarUsuarioArtesao();
    await criarLoja(artesao.id);
    const token = gerarToken(artesao.id, "ARTESAO");

    await request(app)
      .post("/produtos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Peça Única",
        categoria: "Cerâmica",
        tecnica: "Cerâmica",
        origem: "Agreste",
        preco: 150,
        modalidadeProducao: "PECA_UNICA",
        estoque: 2,
        imagens: [],
      })
      .expect(400);
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

    const p1 = await criarProduto(categoria.id, loja.id, { nome: "Produto A", preco: 100 });
    const p2 = await criarProduto(categoria.id, loja.id, { nome: "Produto B", preco: 200 });

    const resposta = await request(app)
      .get(`/produtos/comparar?ids=${p1.id},${p2.id}`)
      .expect(200);

    expect(resposta.body.produtosComparados).toHaveLength(2);
    expect(resposta.body.produtosComparados[0].tecnica).toBeDefined();
  });
});
