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

async function criarCarrinhoComItem(usuarioId: string, produtoId: string, quantidade = 1) {
  const carrinho = await prisma.carrinho.create({
    data: {
      usuarioId,
      itens: {
        create: [{ produtoId, quantidade, precoUnitario: 100 }],
      },
    },
  });
  return carrinho;
}

async function criarEndereco(usuarioId: string) {
  return prisma.enderecoEntrega.create({
    data: {
      cep: "50000-000",
      rua: "Rua Teste",
      numero: "123",
      bairro: "Centro",
      cidade: "Recife",
      usuarioId,
    },
  });
}

describe("Pedidos - endpoints e persistência", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  test("POST /pedidos/checkout cria pedido e itens persistidos", async () => {
    const comprador = await criarUsuarioComprador();
    const endereco = await criarEndereco(comprador.id);
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);
    const produto = await criarProduto(categoria.id, loja.id, {
      statusValidacao: "APROVADA",
      estoque: 5,
      preco: 100,
    });
    await criarCarrinhoComItem(comprador.id, produto.id, 2);
    const token = gerarToken(comprador.id, "COMPRADOR");

    const resposta = await request(app)
      .post("/pedidos/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({
        enderecoEntrega: {
          cep: endereco.cep,
          rua: endereco.rua,
          numero: endereco.numero,
        },
      })
      .expect(201);

    expect(resposta.body.pedidoId).toBeDefined();
    expect(resposta.body.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(resposta.body.valorTotal).toBe(200);

    // Verifica persistência no banco
    const pedido = await prisma.pedido.findUnique({
      where: { id: resposta.body.pedidoId },
      include: { itens: true },
    });
    expect(pedido).not.toBeNull();
    expect(pedido!.usuarioId).toBe(comprador.id);
    expect(pedido!.enderecoEntregaId).toBe(endereco.id);
    expect(pedido!.itens).toHaveLength(2);
  });

  test("POST /pedidos/checkout sem autenticação retorna 401", async () => {
    await request(app)
      .post("/pedidos/checkout")
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
      .expect(401);
  });

  test("GET /pedidos/comprador/pedidos lista pedidos do comprador", async () => {
    const comprador = await criarUsuarioComprador();
    const endereco = await criarEndereco(comprador.id);
    const categoria = await criarCategoria();
    const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id);
    const produto = await criarProduto(categoria.id, loja.id, {
      statusValidacao: "APROVADA",
      estoque: 5,
    });
    const token = gerarToken(comprador.id, "COMPRADOR");

    // Cria um pedido direto no banco para testar listagem
    await prisma.pedido.create({
      data: {
        usuarioId: comprador.id,
        enderecoEntregaId: endereco.id,
        status: "AGUARDANDO_PAGAMENTO",
        itens: {
          create: [
            {
              produtoId: produto.id,
              quantidade: 2,
              precoUnitario: Number(produto.preco),
              subtotal: Number(produto.preco) * 2,
            },
          ],
        },
      },
    });

    const resposta = await request(app)
      .get("/pedidos/comprador/pedidos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(resposta.body.pedidos).toHaveLength(1);
    expect(resposta.body.pedidos[0].id).toBeDefined();
    expect(resposta.body.pedidos[0].itens).toHaveLength(1);
    expect(resposta.body.pedidos[0].itens[0].produtoId).toBe(produto.id);
  });

  test("GET /pedidos/comprador/pedidos sem autenticação retorna 401", async () => {
    await request(app).get("/pedidos/comprador/pedidos").expect(401);
  });

  test("PUT /pedidos/artesao/pedidos/:id/status atualiza status", async () => {
    const comprador = await criarUsuarioComprador();
    const artesao = await criarUsuarioArtesao();
    const endereco = await criarEndereco(comprador.id);
    const categoria = await criarCategoria();
    const loja = await criarLoja(artesao.id);
    const produto = await criarProduto(categoria.id, loja.id, {
      statusValidacao: "APROVADA",
      estoque: 5,
    });

    const pedido = await prisma.pedido.create({
      data: {
        usuarioId: comprador.id,
        enderecoEntregaId: endereco.id,
        status: "AGUARDANDO_PAGAMENTO",
        itens: {
          create: [
            {
              produtoId: produto.id,
              quantidade: 1,
              precoUnitario: Number(produto.preco),
              subtotal: Number(produto.preco),
            },
          ],
        },
      },
    });

    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .put(`/pedidos/artesao/pedidos/${pedido.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CONFIRMADO" })
      .expect(200);

    expect(resposta.body.id).toBe(pedido.id);

    const atualizado = await prisma.pedido.findUnique({ where: { id: pedido.id } });
    expect(atualizado!.status).toBe("CONFIRMADO");
  });

  test("GET /pedidos/artesao/pedidos lista pedidos recebidos pelo artesão", async () => {
    const comprador = await criarUsuarioComprador();
    const artesao = await criarUsuarioArtesao();
    const endereco = await criarEndereco(comprador.id);
    const categoria = await criarCategoria();
    const loja = await criarLoja(artesao.id);
    const produto = await criarProduto(categoria.id, loja.id, {
      statusValidacao: "APROVADA",
      estoque: 5,
    });

    await prisma.pedido.create({
      data: {
        usuarioId: comprador.id,
        enderecoEntregaId: endereco.id,
        status: "AGUARDANDO_PAGAMENTO",
        itens: {
          create: [
            {
              produtoId: produto.id,
              quantidade: 1,
              precoUnitario: Number(produto.preco),
              subtotal: Number(produto.preco),
            },
          ],
        },
      },
    });

    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .get("/pedidos/artesao/pedidos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(resposta.body.pedidosRecebidos).toHaveLength(1);
    expect(resposta.body.pedidosRecebidos[0].itens[0].produtoId).toBe(produto.id);
  });
});
