import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCarrinhoComItem,
  criarCategoria,
  criarEndereco,
  criarLoja,
  criarPedido,
  criarProduto,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

async function cenario() {
  const comprador = await criarUsuarioComprador();
  const artesao = await criarUsuarioArtesao();
  const categoria = await criarCategoria();
  const loja = await criarLoja(artesao.id);
  const produto = await criarProduto(categoria.id, loja.id, { estoque: 5, preco: 100 });
  const endereco = await criarEndereco();
  return { comprador, artesao, produto, endereco };
}

describe("Pedidos - endpoints e persistência", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("POST /pedidos/checkout cria pedido e itens persistidos", async () => {
    const { comprador, produto } = await cenario();
    await criarCarrinhoComItem(comprador.id, produto.id, 2);
    const token = gerarToken(comprador.id, "COMPRADOR");

    const resposta = await request(app)
      .post("/pedidos/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Teste", numero: "123" } })
      .expect(201);

    expect(resposta.body.pedidoId).toEqual(expect.any(String));
    expect(resposta.body.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(resposta.body.valorTotal).toBe(200);

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(resposta.body.pedidoId) },
      include: { itens: true, historico: true },
    });
    expect(pedido).not.toBeNull();
    expect(pedido!.usuarioId).toBe(comprador.id);
    expect(pedido!.itens).toHaveLength(1);
    expect(pedido!.itens[0].quantidade).toBe(2);
    expect(pedido!.historico).toHaveLength(1);

    const carrinho = await prisma.itemCarrinho.count();
    expect(carrinho).toBe(0);
  });

  test("POST /pedidos/checkout sem autenticação retorna 401", async () => {
    await request(app)
      .post("/pedidos/checkout")
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
      .expect(401);
  });

  test("POST /pedidos/checkout com carrinho vazio retorna 400", async () => {
    const comprador = await criarUsuarioComprador();
    await request(app)
      .post("/pedidos/checkout")
      .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
      .expect(400);
  });

  test("GET /pedidos/comprador/pedidos lista pedidos do comprador", async () => {
    const { comprador, produto, endereco } = await cenario();
    await criarPedido(comprador.id, endereco.id, produto.id, 2);

    const resposta = await request(app)
      .get("/pedidos/comprador/pedidos")
      .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
      .expect(200);

    expect(resposta.body.pedidos).toHaveLength(1);
    expect(resposta.body.pedidos[0].id).toBeDefined();
    expect(resposta.body.pedidos[0].valorTotal).toBe(200);
    expect(resposta.body.pedidos[0].itens).toHaveLength(1);
    expect(resposta.body.pedidos[0].itens[0].produtoId).toBe(String(produto.id));
  });

  test("GET /pedidos/comprador/pedidos sem autenticação retorna 401", async () => {
    await request(app).get("/pedidos/comprador/pedidos").expect(401);
  });

  test("PUT /pedidos/artesao/pedidos/:id/status atualiza status e guarda rastreio", async () => {
    const { comprador, artesao, produto, endereco } = await cenario();
    const pedido = await criarPedido(comprador.id, endereco.id, produto.id);
    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .put(`/pedidos/artesao/pedidos/${pedido.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "ENVIADO", codigoRastreio: "BR123" })
      .expect(200);

    expect(resposta.body.id).toBe(String(pedido.id));

    const atualizado = await prisma.pedido.findUnique({ where: { id: pedido.id } });
    expect(atualizado!.status).toBe("ENVIADO");

    const recebidos = await request(app)
      .get("/pedidos/artesao/pedidos")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recebidos.body.pedidosRecebidos[0].codigoRastreio).toBe("BR123");
  });

  test("GET /pedidos/artesao/pedidos lista pedidos recebidos pelo artesão", async () => {
    const { comprador, artesao, produto, endereco } = await cenario();
    await criarPedido(comprador.id, endereco.id, produto.id);

    const resposta = await request(app)
      .get("/pedidos/artesao/pedidos")
      .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
      .expect(200);

    expect(resposta.body.pedidosRecebidos).toHaveLength(1);
    expect(resposta.body.pedidosRecebidos[0].itens[0].produtoId).toBe(String(produto.id));
  });
});
