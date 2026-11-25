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

describe("Pedidos - criacao, consulta, validacoes e persistencia", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  describe("Criação de Pedidos (Checkout)", () => {
    test("TC10 · POST /pedidos/checkout cria pedido, itens, historico e baixa estoque no banco", async () => {
      const { comprador, produto } = await cenario();
      await criarCarrinhoComItem(comprador.id, produto.id, 2);
      const token = gerarToken(comprador.id, "COMPRADOR");

      const resposta = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Teste", numero: "123", cidade: "Recife" } })
        .expect(201);

      expect(resposta.body.pedidoId).toEqual(expect.any(String));
      expect(resposta.body.status).toBe("AGUARDANDO_PAGAMENTO");
      expect(resposta.body.valorTotal).toBe(218);

      // Persistência no banco do pedido, itens e histórico
      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(resposta.body.pedidoId) },
        include: { itens: true, historico: true, enderecoEntrega: true },
      });
      expect(pedido).not.toBeNull();
      expect(pedido!.usuarioId).toBe(comprador.id);
      expect(pedido!.itens).toHaveLength(1);
      expect(pedido!.itens[0].quantidade).toBe(2);
      expect(pedido!.historico).toHaveLength(1);
      expect(pedido!.historico[0].status).toBe("AGUARDANDO_PAGAMENTO");
      expect(pedido!.enderecoEntrega.cidade).toBe("Recife");

      // Estoque baixado de 5 para 3
      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(3);

      // Carrinho esvaziado
      const carrinho = await prisma.itemCarrinho.count();
      expect(carrinho).toBe(0);
    });

    test("POST /pedidos/checkout com estoque insuficiente retorna erro 409 e nao cria pedido nem altera estoque", async () => {
      const { comprador, produto } = await cenario();
      // Carrinho pede 10, mas estoque tem apenas 5
      await criarCarrinhoComItem(comprador.id, produto.id, 10);
      const token = gerarToken(comprador.id, "COMPRADOR");

      const resposta = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
        .expect(409);

      expect(resposta.body.mensagem).toMatch(/estoque insuficiente/i);

      // Nenhum pedido criado e estoque intacto
      const totalPedidos = await prisma.pedido.count();
      expect(totalPedidos).toBe(0);

      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(5);
    });

    test("POST /pedidos/checkout com carrinho vazio retorna erro 400 padronizado", async () => {
      const comprador = await criarUsuarioComprador();
      const resposta = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
        .expect(400);

      expect(resposta.body.mensagem).toBe("Carrinho vazio.");
    });

    test("POST /pedidos/checkout valida campos obrigatorios e CEP invalido", async () => {
      const { comprador, produto } = await cenario();
      await criarCarrinhoComItem(comprador.id, produto.id, 1);
      const token = gerarToken(comprador.id, "COMPRADOR");

      // Sem endereco
      const resVazio = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(resVazio.body.mensagem).toBeDefined();
      expect(resVazio.body.erros).toBeDefined();

      // CEP com formato invalido
      const resCepInvalido = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ enderecoEntrega: { cep: "123", rua: "Rua", numero: "1" } })
        .expect(400);

      expect(resCepInvalido.body.mensagem).toMatch(/cep invalido/i);
    });

    test("POST /pedidos/checkout sem autenticação retorna 401 padronizado", async () => {
      const resposta = await request(app)
        .post("/pedidos/checkout")
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" } })
        .expect(401);

      expect(resposta.body.mensagem).toBeDefined();
    });
  });

  describe("Consulta de Pedidos", () => {
    test("TC22 · GET /comprador/pedidos lista historico do comprador autenticado", async () => {
      const { comprador, produto, endereco } = await cenario();
      await criarPedido(comprador.id, endereco.id, produto.id, 2);

      const resposta = await request(app)
        .get("/comprador/pedidos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .expect(200);

      expect(resposta.body.pedidos).toHaveLength(1);
      expect(resposta.body.pedidos[0].id).toBeDefined();
      expect(resposta.body.pedidos[0].valorTotal).toBe(200);
      expect(resposta.body.pedidos[0].itens).toHaveLength(1);
      expect(resposta.body.pedidos[0].itens[0].produtoId).toBe(String(produto.id));
    });

    test("TC22 · GET /pedidos/:id consulta detalhes de um pedido especifico do comprador", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 1, 150);

      const resposta = await request(app)
        .get(`/pedidos/${pedido.id}`)
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .expect(200);

      expect(resposta.body.id).toBe(String(pedido.id));
      expect(resposta.body.valorTotal).toBe(150);
      expect(resposta.body.itens).toHaveLength(1);
      expect(resposta.body.itens[0].produtoId).toBe(String(produto.id));
      expect(resposta.body.historico).toBeDefined();
    });

    test("TC22 · GET /pedidos/:id de outro usuario retorna 404 padronizado", async () => {
      const { comprador, produto, endereco } = await cenario();
      const outroComprador = await criarUsuarioComprador();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .get(`/pedidos/${pedido.id}`)
        .set("Authorization", `Bearer ${gerarToken(outroComprador.id, "COMPRADOR")}`)
        .expect(404);

      expect(resposta.body.mensagem).toBe("Pedido nao encontrado.");
    });

    test("TC22 · GET /artesao/pedidos lista pedidos contendo itens da loja do artesao", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .get("/artesao/pedidos")
        .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
        .expect(200);

      expect(resposta.body.pedidosRecebidos).toHaveLength(1);
      expect(resposta.body.pedidosRecebidos[0].itens[0].produtoId).toBe(String(produto.id));
      expect(resposta.body.pedidosRecebidos[0].comprador.nome).toBe(comprador.nome);
      expect(resposta.body.pedidosRecebidos[0].proximaAcao).toBeDefined();
    });
  });

  describe("Pagamento de Pedidos", () => {
    test("POST /pagamentos processa pagamento com sucesso e atualiza pedido para PAGO", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 1, 100);

      const resposta = await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({
          pedidoId: String(pedido.id),
          metodoPagamento: "PIX",
          tokenCartao: null,
        })
        .expect(200);

      expect(resposta.body.transacaoId).toBeDefined();
      expect(resposta.body.status).toBe("APROVADO");
      expect(resposta.body.dataPagamento).toBeDefined();

      // Pedido atualizado no banco
      const pedidoAtualizado = await prisma.pedido.findUnique({
        where: { id: pedido.id },
        include: { historico: true, pagamentos: true },
      });
      expect(pedidoAtualizado!.status).toBe("PAGO");
      expect(pedidoAtualizado!.pagamentos).toHaveLength(1);
      expect(pedidoAtualizado!.pagamentos[0].formaPagamento).toBe("PIX");
      expect(pedidoAtualizado!.historico.some((h) => h.status === "PAGO")).toBe(true);

      // Carrinho do comprador atualizado para PAGO no banco
      const carrinhoAtualizado = await prisma.carrinho.findUnique({
        where: { usuarioId: comprador.id },
      });
      if (carrinhoAtualizado) {
        expect(carrinhoAtualizado.status).toBe("PAGO");
      }
    });

    test("POST /pagamentos com cartao exige token do cartao", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({
          pedidoId: String(pedido.id),
          metodoPagamento: "CARTAO_CREDITO",
          tokenCartao: null,
        })
        .expect(400);

      expect(resposta.body.mensagem).toMatch(/cartao/i);
    });

    test("POST /pagamentos em pedido ja pago retorna 400 padronizado", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      // Paga a primeira vez
      await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null })
        .expect(200);

      // Tenta pagar novamente
      const resposta = await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null })
        .expect(400);

      expect(resposta.body.mensagem).toMatch(/ja se encontra pago/i);
    });

    test("TC21 · RN33 · pagamento recusado cancela pedido, persiste motivo e libera reserva de peça única", async () => {
      const comprador = await criarUsuarioComprador();
      const segundoComprador = await criarUsuarioComprador();
      const artesao = await criarUsuarioArtesao();
      const loja = await criarLoja(artesao.id);
      const categoria = await criarCategoria();
      const produto = await prisma.produto.create({
        data: {
          nome: "Escultura Única Barro",
          descricao: "Peça exclusiva",
          tecnica: "Cerâmica",
          origem: "Caruaru",
          preco: 250,
          modalidadeProducao: "PECA_UNICA",
          pecaUnica: true,
          categoriaId: categoria.id,
          lojaId: loja.id,
          estoque: { create: { quantidadeDisponivel: 1, pontoReposicao: 0 } },
        },
      });
      await criarCarrinhoComItem(comprador.id, produto.id, 1);

      const checkout = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({ enderecoEntrega: { cep: "55002-000", rua: "Rua do Barro", numero: "10", cidade: "Caruaru" } })
        .expect(201);

      // Reserva ativa baixou o estoque da peça única para 0
      const estoqueReservado = await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } });
      expect(estoqueReservado.quantidadeDisponivel).toBe(0);

      const recusa = await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({
          pedidoId: String(checkout.body.pedidoId),
          metodoPagamento: "CARTAO_CREDITO",
          tokenCartao: "tok_recusado_saldo",
          motivoFalha: "Saldo insuficiente no cartão.",
        })
        .expect(402);

      expect(recusa.body.status).toBe("RECUSADO");
      expect(recusa.body.statusPedido).toBe("CANCELADO");
      expect(recusa.body.reservaLiberada).toBe(true);
      expect(recusa.body.mensagem).toMatch(/Saldo insuficiente/i);

      const pedidoNoBanco = await prisma.pedido.findUniqueOrThrow({
        where: { id: Number(checkout.body.pedidoId) },
        include: { pagamentos: true, historico: true },
      });
      expect(pedidoNoBanco.status).toBe("CANCELADO");
      expect(pedidoNoBanco.pagamentos).toHaveLength(1);
      expect(pedidoNoBanco.pagamentos[0].status).toBe("RECUSADO");
      expect(pedidoNoBanco.pagamentos[0].motivo).toBe("Saldo insuficiente no cartão.");
      expect(pedidoNoBanco.historico.some((h) => h.status === "CANCELADO" && h.observacao?.includes("Reserva liberada"))).toBe(true);

      // Estoque da peça única foi restaurado para 1
      const estoqueLiberado = await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } });
      expect(estoqueLiberado.quantidadeDisponivel).toBe(1);

      // Segundo comprador consegue reservar e concluir compra da peça liberada
      await criarCarrinhoComItem(segundoComprador.id, produto.id, 1);
      const novoCheckout = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${gerarToken(segundoComprador.id, "COMPRADOR")}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Nova", numero: "20", cidade: "Recife" } })
        .expect(201);
      expect(novoCheckout.body.pedidoId).toBeDefined();
    });

    test("TC21 · RN33 · pagamento expirado libera reserva de estoque uma única vez", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 2, 100);
      await prisma.estoque.update({
        where: { produtoId: produto.id },
        data: { quantidadeDisponivel: 3 },
      });

      const res = await request(app)
        .post("/pagamentos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .send({
          pedidoId: String(pedido.id),
          metodoPagamento: "PIX",
          tokenCartao: null,
          resultado: "EXPIRADO",
        })
        .expect(402);

      expect(res.body.status).toBe("EXPIRADO");
      expect(res.body.reservaLiberada).toBe(true);

      const estoque = await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } });
      expect(estoque.quantidadeDisponivel).toBe(5);
    });

    test("TC21 · RN38 · eventos repetidos e simultâneos com a mesma Idempotency-Key não duplicam pagamento nem histórico", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 1, 100);
      const token = `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`;
      const chave = `evt-pix-${Date.now()}`;

      // Duas chamadas simultâneas com a mesma chave de idempotência
      const [r1, r2] = await Promise.all([
        request(app)
          .post("/pagamentos")
          .set("Authorization", token)
          .set("Idempotency-Key", chave)
          .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null }),
        request(app)
          .post("/pagamentos")
          .set("Authorization", token)
          .set("Idempotency-Key", chave)
          .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null }),
      ]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(r1.body.transacaoId).toBe(r2.body.transacaoId);
      expect([r1.body.idempotente, r2.body.idempotente].sort()).toEqual([false, true]);

      // Replay sequencial posterior mantém a mesma transação sem duplicar registros
      const r3 = await request(app)
        .post("/pagamentos")
        .set("Authorization", token)
        .set("Idempotency-Key", chave)
        .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null })
        .expect(200);

      expect(r3.body.transacaoId).toBe(r1.body.transacaoId);
      expect(r3.body.idempotente).toBe(true);

      expect(await prisma.pagamento.count({ where: { pedidoId: pedido.id } })).toBe(1);
      expect(await prisma.historicoPedido.count({ where: { pedidoId: pedido.id, status: "PAGO" } })).toBe(1);

      // Reuso da mesma chave em outro pedido retorna conflito 409
      const outroPedido = await criarPedido(comprador.id, endereco.id, produto.id, 1, 100);
      await request(app)
        .post("/pagamentos")
        .set("Authorization", token)
        .set("Idempotency-Key", chave)
        .send({ pedidoId: String(outroPedido.id), metodoPagamento: "PIX", tokenCartao: null })
        .expect(409);
    });

    test("TC21 · RN33/RN38 · recusa concorrente com mesma Idempotency-Key repõe estoque uma única vez", async () => {
      const { comprador, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 2, 100);
      await prisma.estoque.update({
        where: { produtoId: produto.id },
        data: { quantidadeDisponivel: 1 },
      });

      const token = `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`;
      const chave = `evt-recusa-${Date.now()}`;

      const [r1, r2] = await Promise.all([
        request(app)
          .post("/pagamentos")
          .set("Authorization", token)
          .set("Idempotency-Key", chave)
          .send({ pedidoId: String(pedido.id), metodoPagamento: "CARTAO_CREDITO", tokenCartao: "tok_recusado_1" }),
        request(app)
          .post("/pagamentos")
          .set("Authorization", token)
          .set("Idempotency-Key", chave)
          .send({ pedidoId: String(pedido.id), metodoPagamento: "CARTAO_CREDITO", tokenCartao: "tok_recusado_1" }),
      ]);

      expect(r1.status).toBe(402);
      expect(r2.status).toBe(402);
      expect(r1.body.transacaoId).toBe(r2.body.transacaoId);

      // Estoque subiu de 1 para 3 (uma única reposição de 2 unidades)
      const estoque = await prisma.estoque.findUniqueOrThrow({ where: { produtoId: produto.id } });
      expect(estoque.quantidadeDisponivel).toBe(3);
      expect(await prisma.pagamento.count({ where: { pedidoId: pedido.id } })).toBe(1);
    });
  });

  describe("Atualização de Status de Pedido pelo Artesão", () => {
    test("TC07 · PUT /artesao/pedidos/:id/status atualiza status para ENVIADO com codigo de rastreio", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);
      const token = gerarToken(artesao.id, "ARTESAO");

      const resposta = await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ statusProducao: "ENVIADO", codigoRastreioCorreios: "BR123456789" })
        .expect(200);

      expect(resposta.body.id).toBe(String(pedido.id));
      expect(resposta.body.statusProducao).toBe("ENVIADO");

      const atualizado = await prisma.pedido.findUnique({
        where: { id: pedido.id },
        include: { historico: true },
      });
      expect(atualizado!.status).toBe("ENVIADO");
      expect(atualizado!.historico.some((h) => h.observacao?.includes("BR123456789"))).toBe(true);
    });

    test("TC07 · PUT /artesao/pedidos/:id/status para ENVIADO sem codigo de rastreio retorna 400", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
        .send({ statusProducao: "ENVIADO" })
        .expect(400);

      expect(resposta.body.mensagem).toMatch(/rastreio/i);
    });

    test("TC07 · PUT /artesao/pedidos/:id/status para CANCELADO restaura estoque no banco", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      // Pedido de 2 unidades
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 2);

      // Simulamos estoque atual em 3
      await prisma.estoque.update({
        where: { produtoId: produto.id },
        data: { quantidadeDisponivel: 3 },
      });

      await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
        .send({ statusProducao: "CANCELADO" })
        .expect(200);

      // Estoque foi restaurado de 3 para 5
      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(5);

      // Tentativa de alterar pedido ja cancelado retorna 409
      const resTentativa = await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
        .send({ statusProducao: "EM_PRODUCAO" })
        .expect(409);

      expect(resTentativa.body.mensagem).toMatch(/nao pode mais ser alterado/i);
    });

    test("duas solicitacoes simultaneas de cancelamento repõem o estoque uma unica vez", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 2);
      const token = `Bearer ${gerarToken(artesao.id, "ARTESAO")}`;

      // Estado de estoque após a venda: 3. As duas requisições tentam cancelar
      // o mesmo pedido simultaneamente; somente uma deve ganhar a transição.
      await prisma.estoque.update({
        where: { produtoId: produto.id },
        data: { quantidadeDisponivel: 3 },
      });

      const cancelar = () =>
        request(app)
          .put(`/artesao/pedidos/${pedido.id}/status`)
          .set("Authorization", token)
          .send({ statusProducao: "CANCELADO" });

      const respostas = await Promise.all([cancelar(), cancelar()]);
      expect(respostas.map((resposta) => resposta.status).sort()).toEqual([200, 409]);

      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(5);
    });

    test("TC07 · transicao concorrente nao reabre pedido depois do cancelamento e da reposicao", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id, 2);
      const token = `Bearer ${gerarToken(artesao.id, "ARTESAO")}`;

      await prisma.estoque.update({
        where: { produtoId: produto.id },
        data: { quantidadeDisponivel: 3 },
      });

      const cancelar = () =>
        request(app)
          .put(`/artesao/pedidos/${pedido.id}/status`)
          .set("Authorization", token)
          .send({ statusProducao: "CANCELADO" });
      const enviar = () =>
        request(app)
          .put(`/artesao/pedidos/${pedido.id}/status`)
          .set("Authorization", token)
          .send({ statusProducao: "ENVIADO", codigoRastreio: "BR123456789" });

      const respostas = await Promise.all([cancelar(), enviar()]);
      expect(respostas.every((resposta) => [200, 409].includes(resposta.status))).toBe(true);

      const pedidoFinal = await prisma.pedido.findUnique({
        where: { id: pedido.id },
        include: { historico: { orderBy: { id: "desc" }, take: 1 } },
      });
      expect(pedidoFinal!.status).toBe("CANCELADO");
      expect(pedidoFinal!.historico[0].status).toBe("CANCELADO");

      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(5);
    });

    test("TC07 · Pedido multiloja nao pode ter status alterado globalmente", async () => {
      const comprador = await criarUsuarioComprador();
      const artesao1 = await criarUsuarioArtesao();
      const artesao2 = await criarUsuarioArtesao();
      const loja1 = await criarLoja(artesao1.id);
      const loja2 = await criarLoja(artesao2.id);
      const cat = await criarCategoria();

      const p1 = await criarProduto(cat.id, loja1.id, { nome: "Peça 1", preco: 50 });
      const p2 = await criarProduto(cat.id, loja2.id, { nome: "Peça 2", preco: 70 });

      const endereco = await criarEndereco();

      // Cria carrinho com os dois produtos
      const carrinho = await prisma.carrinho.create({
        data: {
          usuarioId: comprador.id,
          status: "ATIVO",
          dataCriacao: new Date(),
        },
      });

      await prisma.itemCarrinho.createMany({
        data: [
          { carrinhoId: carrinho.id, numeroItem: 1, produtoId: p1.id, quantidade: 1, precoUnitario: 50 },
          { carrinhoId: carrinho.id, numeroItem: 2, produtoId: p2.id, quantidade: 1, precoUnitario: 70 },
        ],
      });

      const token = gerarToken(comprador.id, "COMPRADOR");

      const respCheckout = await request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Teste", numero: "1", cidade: "Recife" } })
        .expect(201);

      const pedidoId = respCheckout.body.pedidoId;

      // Tenta alterar status do pedido multiloja
      const resStatus = await request(app)
        .put(`/artesao/pedidos/${pedidoId}/status`)
        .set("Authorization", `Bearer ${gerarToken(artesao1.id, "ARTESAO")}`)
        .send({ statusProducao: "ENVIADO", codigoRastreio: "BR123456789" })
        .expect(409);

      expect(resStatus.body.mensagem).toMatch(/lojas.*não podem ser alterados globalmente|separe em subpedidos/i);
    });

    test("checkout relê quantidade e preço após aguardar o lock do carrinho", async () => {
      const comprador = await criarUsuarioComprador();
      const artesao = await criarUsuarioArtesao();
      const loja = await criarLoja(artesao.id);
      const categoria = await criarCategoria();
      const produto = await criarProduto(categoria.id, loja.id, { nome: "Produto Teste Estoque", preco: 10, estoque: 5 });
      const carrinho = await criarCarrinhoComItem(comprador.id, produto.id, 1);
      const token = gerarToken(comprador.id, "COMPRADOR");

      let sinalizarLock!: () => void;
      let liberarLock!: () => void;
      const lockObtido = new Promise<void>((resolve) => { sinalizarLock = resolve; });
      const aguardarLiberacao = new Promise<void>((resolve) => { liberarLock = resolve; });
      const transacaoConcorrente = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinho.id} FOR UPDATE`;
        sinalizarLock();
        await aguardarLiberacao;
        await tx.itemCarrinho.update({
          where: { carrinhoId_numeroItem: { carrinhoId: carrinho.id, numeroItem: 1 } },
          data: { quantidade: 2 },
        });
        await tx.produto.update({ where: { id: produto.id }, data: { preco: 20 } });
      });
      await lockObtido;

      const checkoutPromise = request(app)
        .post("/pedidos/checkout")
        .set("Authorization", `Bearer ${token}`)
        .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Teste", numero: "1", cidade: "Recife" } });
      const respostaCheckout = checkoutPromise.then((resposta) => resposta);

      // Aguarda o checkout chegar à consulta FOR UPDATE antes de alterar a linha.
      // A query de pg_stat_activity é restrita ao banco de teste e à conexão desta suíte.
      const limite = Date.now() + 5000;
      let checkoutAguardandoLock = false;
      while (Date.now() < limite) {
        const consultas = await prisma.$queryRaw<Array<{ quantidade: number }>>`
          SELECT COUNT(*)::int AS quantidade
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock'
            AND query ILIKE '%SELECT id_carrinho FROM carrinho%FOR UPDATE%'
        `;
        if (consultas[0]?.quantidade > 0) {
          checkoutAguardandoLock = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      liberarLock();
      await transacaoConcorrente;
      expect(checkoutAguardandoLock).toBe(true);

      const resCheckout = await respostaCheckout;
      expect(resCheckout.status).toBe(201);

      // O pedido usa a quantidade e o preço confirmados enquanto o checkout aguardava.
      expect(resCheckout.body.pedidoId).toBeDefined();
      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(resCheckout.body.pedidoId) },
        include: { itens: true },
      });
      expect(pedido).not.toBeNull();
      expect(pedido!.itens).toHaveLength(1);
      expect(pedido!.itens[0].quantidade).toBe(2);
      expect(Number(pedido!.itens[0].precoUnitario)).toBe(20);

      // Estoque baixado de 5 para 3.
      const estoque = await prisma.estoque.findUnique({ where: { produtoId: produto.id } });
      expect(estoque!.quantidadeDisponivel).toBe(3);

      const carrinhoAtual = await prisma.itemCarrinho.count({ where: { carrinhoId: carrinho.id } });
      expect(carrinhoAtual).toBe(0);
    });
  });

  describe("Respostas de erro padronizadas e seguranca", () => {
    test("Acesso a rota inexistente retorna 404 padronizado { mensagem }", async () => {
      const resposta = await request(app).get("/rota-inexistente-123").expect(404);
      expect(resposta.body).toEqual({ mensagem: "Rota nao encontrada." });
    });

    test("Comprador tentando acessar rota de artesao recebe 403 padronizado", async () => {
      const comprador = await criarUsuarioComprador();
      const resposta = await request(app)
        .get("/artesao/pedidos")
        .set("Authorization", `Bearer ${gerarToken(comprador.id, "COMPRADOR")}`)
        .expect(403);

      expect(resposta.body.mensagem).toMatch(/acesso negado/i);
    });
  });
});
