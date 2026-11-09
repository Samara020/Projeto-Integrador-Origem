import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCategoria, criarEndereco, criarLoja, criarPedido, criarProduto,
  criarUsuarioArtesao, criarUsuarioComprador, gerarToken, limparBanco,
} from "./helpers";

const app = criarApp();
beforeEach(limparBanco);

async function cenario() {
  const comprador = await criarUsuarioComprador();
  const outroComprador = await criarUsuarioComprador();
  const artesao = await criarUsuarioArtesao();
  const outroArtesao = await criarUsuarioArtesao();
  const categoria = await criarCategoria();
  const loja = await criarLoja(artesao.id);
  await criarLoja(outroArtesao.id);
  const produto = await criarProduto(categoria.id, loja.id);
  const endereco = await criarEndereco();
  const pedido = await criarPedido(comprador.id, endereco.id, produto.id);
  return { comprador, outroComprador, artesao, outroArtesao, produto, pedido };
}

test("comprador não vê pedidos de outro comprador no histórico", async () => {
  const { outroComprador } = await cenario();
  const resposta = await request(app).get("/pedidos/comprador/pedidos")
    .set("Authorization", `Bearer ${gerarToken(outroComprador.id, "COMPRADOR")}`).expect(200);
  expect(resposta.body.pedidos).toEqual([]);
});

test("comprador não paga nem cancela pedido de outra conta", async () => {
  const { outroComprador, pedido } = await cenario();
  const auth = `Bearer ${gerarToken(outroComprador.id, "COMPRADOR")}`;
  await request(app).post("/pagamentos").set("Authorization", auth)
    .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null }).expect(403);
  await request(app).post(`/pedidos/${pedido.id}/cancelar`).set("Authorization", auth).expect(403);
  expect(await prisma.pagamento.count()).toBe(0);
  expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe("AGUARDANDO_PAGAMENTO");
});

test("artesão não lista nem altera pedido de outra loja", async () => {
  const { outroArtesao, pedido } = await cenario();
  const auth = `Bearer ${gerarToken(outroArtesao.id, "ARTESAO")}`;
  const lista = await request(app).get("/pedidos/artesao/pedidos").set("Authorization", auth).expect(200);
  expect(lista.body.pedidosRecebidos).toEqual([]);
  await request(app).put(`/pedidos/artesao/pedidos/${pedido.id}/status`).set("Authorization", auth)
    .send({ status: "ENVIADO", codigoRastreio: "INDEVIDO" }).expect(403);
  expect(await prisma.historicoPedido.count()).toBe(0);
  expect((await prisma.pedido.findUniqueOrThrow({ where: { id: pedido.id } })).status).toBe("AGUARDANDO_PAGAMENTO");
});

test("artesão não edita, remove nem altera estoque de produto de outra loja", async () => {
  const { outroArtesao, produto } = await cenario();
  const auth = `Bearer ${gerarToken(outroArtesao.id, "ARTESAO")}`;
  await request(app).put(`/produtos/${produto.id}`).set("Authorization", auth).send({ preco: 1 }).expect(403);
  await request(app).delete(`/produtos/${produto.id}`).set("Authorization", auth).expect(403);
  await request(app).put(`/produtos/artesao/pecas/${produto.id}/estoque`).set("Authorization", auth)
    .send({ estoque: 0 }).expect(403);
  expect(Number((await prisma.produto.findUniqueOrThrow({ where: { id: produto.id } })).preco)).toBe(100);
  expect((await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } })).quantidadeDisponivel).toBe(10);
});

test("pedido misto mostra apenas os itens da loja e não permite alterar o status global", async () => {
  const { artesao, outroArtesao, produto, pedido } = await cenario();
  const loja = await prisma.loja.findFirstOrThrow({ where: { usuarioId: outroArtesao.id } });
  const categoria = await criarCategoria("Bordado");
  const outro = await criarProduto(categoria.id, loja.id, { preco: 300 });
  await prisma.itemPedido.create({ data: {
    pedidoId: pedido.id, numeroItem: 2, produtoId: outro.id, quantidade: 1, precoUnitario: 300, subtotal: 300,
  } });
  await prisma.pedido.update({ where: { id: pedido.id }, data: { status: "PAGO" } });
  const auth = `Bearer ${gerarToken(artesao.id, "ARTESAO")}`;
  const lista = await request(app).get("/pedidos/artesao/pedidos").set("Authorization", auth).expect(200);
  expect(lista.body.pedidosRecebidos[0].itens.map((item: { produtoId: string }) => item.produtoId))
    .toEqual([String(produto.id)]);
  expect(lista.body.pedidosRecebidos[0].valorTotal).toBe(100);
  await request(app).put(`/pedidos/artesao/pedidos/${pedido.id}/status`).set("Authorization", auth)
    .send({ status: "ENVIADO" }).expect(403);
});

test("pagamento e cancelamento sem autenticação são recusados", async () => {
  const { pedido } = await cenario();
  await request(app).post("/pagamentos")
    .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null }).expect(401);
  await request(app).post(`/pedidos/${pedido.id}/cancelar`).expect(401);
  expect(await prisma.pagamento.count()).toBe(0);
});

test("pedido antigo sem reserva não cria estoque no cancelamento nem pode ser pago", async () => {
  const { comprador, produto, pedido } = await cenario();
  const auth = `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`;
  await request(app).post("/pagamentos").set("Authorization", auth)
    .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null }).expect(409);
  await request(app).post(`/pedidos/${pedido.id}/cancelar`).set("Authorization", auth).expect(200);
  expect((await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } })).quantidadeDisponivel).toBe(10);
  expect(await prisma.pagamento.count()).toBe(0);
});
