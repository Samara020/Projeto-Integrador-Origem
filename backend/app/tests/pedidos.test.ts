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
    test("POST /pedidos/checkout cria pedido, itens, historico e baixa estoque no banco", async () => {
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
      expect(resposta.body.valorTotal).toBe(200);

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
    test("GET /comprador/pedidos lista historico do comprador autenticado", async () => {
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

    test("GET /pedidos/:id consulta detalhes de um pedido especifico do comprador", async () => {
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

    test("GET /pedidos/:id de outro usuario retorna 404 padronizado", async () => {
      const { comprador, produto, endereco } = await cenario();
      const outroComprador = await criarUsuarioComprador();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .get(`/pedidos/${pedido.id}`)
        .set("Authorization", `Bearer ${gerarToken(outroComprador.id, "COMPRADOR")}`)
        .expect(404);

      expect(resposta.body.mensagem).toBe("Pedido nao encontrado.");
    });

    test("GET /artesao/pedidos lista pedidos contendo itens da loja do artesao", async () => {
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
  });

  describe("Atualização de Status de Pedido pelo Artesão", () => {
    test("PUT /artesao/pedidos/:id/status atualiza status para ENVIADO com codigo de rastreio", async () => {
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

    test("PUT /artesao/pedidos/:id/status para ENVIADO sem codigo de rastreio retorna 400", async () => {
      const { comprador, artesao, produto, endereco } = await cenario();
      const pedido = await criarPedido(comprador.id, endereco.id, produto.id);

      const resposta = await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${gerarToken(artesao.id, "ARTESAO")}`)
        .send({ statusProducao: "ENVIADO" })
        .expect(400);

      expect(resposta.body.mensagem).toMatch(/rastreio/i);
    });

    test("PUT /artesao/pedidos/:id/status para CANCELADO restaura estoque no banco", async () => {
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
