import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCarrinhoComItem, criarCategoria, criarLoja, criarProduto,
  criarUsuarioArtesao, criarUsuarioComprador, gerarToken, limparBanco,
} from "./helpers";

const app = criarApp();
const entrega = { enderecoEntrega: { cep: "50030-230", rua: "Rua da Aurora", numero: "100" } };
const checkout = (token: string) => request(app).post("/pedidos/checkout")
  .set("Authorization", `Bearer ${token}`).send(entrega);
const pagar = (token: string, pedidoId: string, tokenCartao: string | null = null) =>
  request(app).post("/pagamentos").set("Authorization", `Bearer ${token}`)
    .send({ pedidoId, metodoPagamento: tokenCartao === null ? "PIX" : "CARTAO_CREDITO", tokenCartao });
const estoque = (produtoId: number) => prisma.estoque.findUniqueOrThrow({ where: { produtoId } });

async function cenario(quantidade = 1) {
  const comprador = await criarUsuarioComprador();
  const artesao = await criarUsuarioArtesao();
  const categoria = await criarCategoria();
  const loja = await criarLoja(artesao.id);
  const produto = await criarProduto(categoria.id, loja.id, { estoque: quantidade });
  const token = gerarToken(comprador.id, "COMPRADOR");
  await criarCarrinhoComItem(comprador.id, produto.id);
  return { comprador, artesao, categoria, loja, produto, token };
}

beforeEach(limparBanco);

test("jornada HTTP: carrinho, reserva, pagamento e histórico persistem sem segunda baixa", async () => {
  const { token, produto } = await cenario(3);
  const carrinho = await request(app).get("/carrinho").set("Authorization", `Bearer ${token}`).expect(200);
  expect(carrinho.body.valorTotal).toBe(100);
  const criado = await checkout(token).expect(201);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(2);
  const pagamento = await pagar(token, criado.body.pedidoId).expect(200);
  expect(pagamento.body.status).toBe("APROVADO");
  const historico = await request(app).get("/pedidos/comprador/pedidos")
    .set("Authorization", `Bearer ${token}`).expect(200);
  expect(historico.body.pedidos[0]).toMatchObject({ id: criado.body.pedidoId, status: "PAGO", valorTotal: 100 });
  expect(await prisma.pagamento.count()).toBe(1);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(2);
  expect(await prisma.itemCarrinho.count()).toBe(0);
});

test("dois compradores disputam a peça única: só um reserva e o estoque nunca fica negativo", async () => {
  const { token, produto } = await cenario();
  await prisma.produto.update({ where: { id: produto.id }, data: { pecaUnica: true, modalidadeProducao: "PECA_UNICA" } });
  const outro = await criarUsuarioComprador();
  await criarCarrinhoComItem(outro.id, produto.id);
  const resultados = await Promise.all([checkout(token), checkout(gerarToken(outro.id, "COMPRADOR"))]);
  expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
  expect(await prisma.pedido.count()).toBe(1);
  expect(await prisma.itemPedido.count()).toBe(1);
  expect(await prisma.itemCarrinho.count()).toBe(1);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(0);
});

test("duas finalizações simultâneas do mesmo carrinho não duplicam pedido nem baixa", async () => {
  const { token, produto } = await cenario(5);
  const resultados = await Promise.all([checkout(token), checkout(token)]);
  expect(resultados.map((r) => r.status).sort()).toEqual([201, 400]);
  expect(await prisma.pedido.count()).toBe(1);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(4);
});

test("quantidade acima do estoque recusa checkout e preserva carrinho", async () => {
  const { token, produto } = await cenario();
  await prisma.itemCarrinho.updateMany({ data: { quantidade: 2 } });
  await checkout(token).expect(409);
  expect(await prisma.pedido.count()).toBe(0);
  expect(await prisma.enderecoEntrega.count()).toBe(0);
  expect((await prisma.itemCarrinho.findFirstOrThrow()).quantidade).toBe(2);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(1);
});

test("carrinho recusa soma de quantidades acima do estoque sem alterar o item existente", async () => {
  const { token, produto } = await cenario(2);
  await request(app).post("/carrinho/itens").set("Authorization", `Bearer ${token}`)
    .send({ produtoId: String(produto.id), quantidade: 2 }).expect(409);
  expect((await prisma.itemCarrinho.findFirstOrThrow()).quantidade).toBe(1);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(2);
});

test("falha no segundo item desfaz a reserva do primeiro e toda a criação do pedido", async () => {
  const { token, produto, categoria, loja } = await cenario(2);
  const esgotado = await criarProduto(categoria.id, loja.id, { estoque: 0 });
  const carrinho = await prisma.carrinho.findFirstOrThrow();
  await prisma.itemCarrinho.create({ data: {
    carrinhoId: carrinho.id, numeroItem: 2, produtoId: esgotado.id, quantidade: 1, precoUnitario: 100,
  } });
  await checkout(token).expect(409);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(2);
  expect(await prisma.pedido.count()).toBe(0);
  expect(await prisma.itemPedido.count()).toBe(0);
  expect(await prisma.historicoPedido.count()).toBe(0);
  expect(await prisma.enderecoEntrega.count()).toBe(0);
  expect(await prisma.itemCarrinho.count()).toBe(2);
});

test("pedido e pagamento preservam o preço da compra após alteração do catálogo", async () => {
  const { token, produto } = await cenario(2);
  // O preço pode mudar enquanto a peça ainda está no carrinho.
  await prisma.produto.update({ where: { id: produto.id }, data: { preco: 125.50 } });
  const criado = await checkout(token).expect(201);
  expect(criado.body.valorTotal).toBe(125.5);
  await prisma.produto.update({ where: { id: produto.id }, data: { preco: 200 } });
  await pagar(token, criado.body.pedidoId).expect(200);
  expect(Number((await prisma.itemPedido.findFirstOrThrow()).precoUnitario)).toBe(125.5);
  expect(Number((await prisma.pagamento.findFirstOrThrow()).valor)).toBe(125.5);
});

test("pagamentos simultâneos e repetição devolvem a mesma transação sem duplicar histórico", async () => {
  const { token, produto } = await cenario(2);
  const criado = await checkout(token).expect(201);
  const respostas = await Promise.all([pagar(token, criado.body.pedidoId), pagar(token, criado.body.pedidoId)]);
  expect(respostas.map((r) => r.status)).toEqual([200, 200]);
  expect(respostas[0].body.transacaoId).toBe(respostas[1].body.transacaoId);
  const repetida = await pagar(token, criado.body.pedidoId).expect(200);
  expect(repetida.body.transacaoId).toBe(respostas[0].body.transacaoId);
  expect(await prisma.pagamento.count()).toBe(1);
  expect(await prisma.historicoPedido.count({ where: { status: "PAGO" } })).toBe(1);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(1);
});

test("cartão sem token não confirma pagamento nem altera o pedido", async () => {
  const { token } = await cenario();
  const criado = await checkout(token).expect(201);
  await request(app).post("/pagamentos").set("Authorization", `Bearer ${token}`)
    .send({ pedidoId: criado.body.pedidoId, metodoPagamento: "CARTAO_CREDITO", tokenCartao: null }).expect(400);
  expect(await prisma.pagamento.count()).toBe(0);
  expect((await prisma.pedido.findFirstOrThrow()).status).toBe("AGUARDANDO_PAGAMENTO");
});

test("cancelamento repetido libera a reserva uma única vez e impede pagamento posterior", async () => {
  const { token, produto } = await cenario();
  const criado = await checkout(token).expect(201);
  const cancelar = () => request(app).post(`/pedidos/${criado.body.pedidoId}/cancelar`)
    .set("Authorization", `Bearer ${token}`);
  const respostas = await Promise.all([cancelar(), cancelar()]);
  expect(respostas.map((r) => r.status)).toEqual([200, 200]);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(1);
  expect(await prisma.historicoPedido.count({ where: { status: "CANCELADO" } })).toBe(1);
  await pagar(token, criado.body.pedidoId).expect(409);
  expect(await prisma.pagamento.count()).toBe(0);
});

test("pedido pago não pode liberar estoque por cancelamento de reserva", async () => {
  const { token, produto } = await cenario();
  const criado = await checkout(token).expect(201);
  await pagar(token, criado.body.pedidoId).expect(200);
  await request(app).post(`/pedidos/${criado.body.pedidoId}/cancelar`)
    .set("Authorization", `Bearer ${token}`).expect(409);
  expect((await estoque(produto.id)).quantidadeDisponivel).toBe(0);
});

test("pagamento e cancelamento concorrentes têm um vencedor e preservam estoque", async () => {
  const { token, produto } = await cenario();
  const criado = await checkout(token).expect(201);
  const [pagamento, cancelamento] = await Promise.all([
    pagar(token, criado.body.pedidoId),
    request(app).post(`/pedidos/${criado.body.pedidoId}/cancelar`).set("Authorization", `Bearer ${token}`),
  ]);
  expect([pagamento.status, cancelamento.status].sort()).toEqual([200, 409]);
  const pedido = await prisma.pedido.findFirstOrThrow();
  if (pedido.status === "PAGO") {
    expect(pagamento.status).toBe(200);
    expect(await prisma.pagamento.count()).toBe(1);
    expect((await estoque(produto.id)).quantidadeDisponivel).toBe(0);
  } else {
    expect(pedido.status).toBe("CANCELADO");
    expect(cancelamento.status).toBe(200);
    expect(await prisma.pagamento.count()).toBe(0);
    expect((await estoque(produto.id)).quantidadeDisponivel).toBe(1);
  }
});

test("falha ao gravar histórico de pagamento reverte a transação e permite nova tentativa", async () => {
  const { token, produto } = await cenario();
  const criado = await checkout(token).expect(201);
  // Falha real no banco isolado, depois da inserção do pagamento, dentro da transação.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION falhar_pagamento_teste() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.status = 'PAGO' THEN RAISE EXCEPTION 'falha injetada pelo teste'; END IF; RETURN NEW; END; $$`);
  try {
    await prisma.$executeRawUnsafe(`CREATE TRIGGER falhar_pagamento_teste BEFORE INSERT ON historico_pedido
      FOR EACH ROW EXECUTE FUNCTION falhar_pagamento_teste()`);
    await pagar(token, criado.body.pedidoId).expect(500);
    expect(await prisma.pagamento.count()).toBe(0);
    expect((await prisma.pedido.findFirstOrThrow()).status).toBe("AGUARDANDO_PAGAMENTO");
    expect((await estoque(produto.id)).quantidadeDisponivel).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER IF EXISTS falhar_pagamento_teste ON historico_pedido");
    await prisma.$executeRawUnsafe("DROP FUNCTION falhar_pagamento_teste()");
  }
  await pagar(token, criado.body.pedidoId).expect(200);
  expect(await prisma.pagamento.count()).toBe(1);
});
