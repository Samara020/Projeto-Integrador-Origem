import { describe, beforeEach, afterAll, test, expect } from "@jest/globals";
import request from "supertest";
import { sign } from "jsonwebtoken";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCategoria,
  criarEndereco,
  criarLoja,
  criarProduto,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

describe("Regressão de Segurança e Integridade (Auditoria 1 a 5)", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  describe("Item 1 - Validação estrita no cadastro", () => {
    const casosInvalidos: [string, Record<string, unknown>][] = [
      ["nome apenas com espaços", { nome: "    ", email: "valido@teste.com", senha: "Password123!", papel: "COMPRADOR" }],
      ["e-mail sem formato válido", { nome: "Ana Silva", email: "nao-e-email", senha: "Password123!", papel: "COMPRADOR" }],
      ["nome numérico", { nome: 12345, email: "valido@teste.com", senha: "Password123!", papel: "COMPRADOR" }],
      ["e-mail numérico", { nome: "Ana Silva", email: 98765, senha: "Password123!", papel: "COMPRADOR" }],
    ];

    test.each(casosInvalidos)("rejeita %s com status 400", async (_caso, payload) => {
      const res = await request(app).post("/auth/register").send(payload).expect(400);
      expect(res.body.mensagem).toBeDefined();
    });
  });

  describe("Item 3 - Proteção de pedido multiloja", () => {
    test("bloqueia com 409 quando artesão mantém ENVIADO e altera rastreio de pedido com duas lojas", async () => {
      const categoria = await criarCategoria();
      const artesao1 = await criarUsuarioArtesao();
      const loja1 = await criarLoja(artesao1.id);
      const prod1 = await criarProduto(categoria.id, loja1.id, { preco: 50, estoque: 5 });

      const artesao2 = await criarUsuarioArtesao();
      const loja2 = await criarLoja(artesao2.id);
      const prod2 = await criarProduto(categoria.id, loja2.id, { preco: 60, estoque: 5 });

      const comprador = await criarUsuarioComprador();
      const endereco = await criarEndereco();

      const pedido = await prisma.pedido.create({
        data: {
          usuarioId: comprador.id,
          enderecoEntregaId: endereco.id,
          status: "ENVIADO",
          data: new Date(),
          itens: {
            create: [
              { numeroItem: 1, produtoId: prod1.id, quantidade: 1, precoUnitario: 50, subtotal: 50 },
              { numeroItem: 2, produtoId: prod2.id, quantidade: 1, precoUnitario: 60, subtotal: 60 },
            ],
          },
        },
      });

      const tokenArtesao1 = gerarToken(artesao1.id, "ARTESAO");

      const res = await request(app)
        .put(`/artesao/pedidos/${pedido.id}/status`)
        .set("Authorization", `Bearer ${tokenArtesao1}`)
        .send({ statusProducao: "ENVIADO", codigoRastreio: "BR999888777" })
        .expect(409);

      expect(res.body.mensagem).toMatch(/múltiplas lojas/i);
    });
  });

  describe("Item 4 - Validação estrutural de claims JWT", () => {
    test.each([
      ["token sem id", { papel: "COMPRADOR" }],
      ["token sem papel", { id: "1" }],
      ["token com id numérico", { id: 123, papel: "COMPRADOR" }],
      ["token com papel inexistente", { id: "1", papel: "SUPERUSER" }],
    ])("rejeita com 401 %s", async (_descricao, claims) => {
      const segredo = process.env.JWT_SECRET!;
      const tokenInvalido = sign(claims, Buffer.from(segredo));

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${tokenInvalido}`)
        .expect(401);
    });
  });

  describe("Item 5 - Revogação persistente no logout e redefinição de senha", () => {
    test("revogação persiste entre instâncias e redefinição invalida sessões anteriores", async () => {
      const cadastro = await request(app)
        .post("/auth/register")
        .send({
          nome: "Mariana Costa",
          email: "mariana@teste.com",
          senha: "SenhaAntiga123!",
          papel: "COMPRADOR",
        })
        .expect(201);

      const tokenSessao1 = cadastro.body.token;

      await new Promise((r) => setTimeout(r, 1100));

      const login2 = await request(app)
        .post("/auth/login")
        .send({ email: "mariana@teste.com", senha: "SenhaAntiga123!" })
        .expect(200);

      const tokenSessao2 = login2.body.token;

      await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${tokenSessao1}`)
        .expect(200);

      const novaInstanciaApp = criarApp();
      await request(novaInstanciaApp)
        .get("/carrinho")
        .set("Authorization", `Bearer ${tokenSessao1}`)
        .expect(401);

      const rec = await request(app)
        .post("/auth/recuperar-senha")
        .send({ email: "mariana@teste.com" })
        .expect(200);

      const tokenRecuperacao = rec.body.tokenRecuperacao;
      expect(tokenRecuperacao).toBeDefined();

      await new Promise((r) => setTimeout(r, 1100));

      await request(app)
        .post("/auth/redefinir-senha")
        .send({ token: tokenRecuperacao, novaSenha: "NovaSenhaForte123!" })
        .expect(200);

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${tokenSessao2}`)
        .expect(401);

      await request(app)
        .post("/auth/redefinir-senha")
        .send({ token: tokenRecuperacao, novaSenha: "OutraSenha123!" })
        .expect(401);

      await new Promise((r) => setTimeout(r, 1100));

      const loginPosRedefinicao = await request(app)
        .post("/auth/login")
        .send({ email: "mariana@teste.com", senha: "NovaSenhaForte123!" })
        .expect(200);

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${loginPosRedefinicao.body.token}`)
        .expect(200);
    });
  });
});