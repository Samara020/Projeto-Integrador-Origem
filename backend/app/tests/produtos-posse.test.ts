import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCategoria,
  criarLoja,
  criarProduto,
  criarUsuarioArtesao,
  gerarToken,
  limparBanco,
} from "./helpers";

// Testes de caracterização da checagem de posse da peça (atualizar, inativar
// e atualizar estoque). Foram escritos antes da refatoração Extract Function
// em produto.service.ts para garantir que o comportamento não mudou.

const app = criarApp();

async function cenario() {
  const categoria = await criarCategoria();
  const dona = await criarUsuarioArtesao();
  const outra = await criarUsuarioArtesao();
  const lojaDona = await criarLoja(dona.id, "Loja da Dona");
  await criarLoja(outra.id, "Loja da Outra");
  const produto = await criarProduto(categoria.id, lojaDona.id, { preco: 100, estoque: 3 });

  return {
    produto,
    tokenDona: gerarToken(dona.id, "ARTESAO"),
    tokenOutra: gerarToken(outra.id, "ARTESAO"),
  };
}

describe("Produtos - posse da peça pelo artesão", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  describe("PUT /produtos/:id", () => {
    test("dona da peça consegue atualizar", async () => {
      const { produto, tokenDona } = await cenario();

      const resposta = await request(app)
        .put(`/produtos/${produto.id}`)
        .set("Authorization", `Bearer ${tokenDona}`)
        .send({ preco: 150 })
        .expect(200);

      expect(resposta.body.preco).toBe(150);
    });

    test("artesã de outra loja recebe 403", async () => {
      const { produto, tokenOutra } = await cenario();

      const resposta = await request(app)
        .put(`/produtos/${produto.id}`)
        .set("Authorization", `Bearer ${tokenOutra}`)
        .send({ preco: 1 })
        .expect(403);

      expect(resposta.body.mensagem).toBe("Voce so pode atualizar suas proprias pecas.");
      const noBanco = await prisma.produto.findUnique({ where: { id: produto.id } });
      expect(Number(noBanco!.preco)).toBe(100);
    });

    test("peça inexistente retorna 404", async () => {
      const { tokenDona } = await cenario();

      const resposta = await request(app)
        .put("/produtos/999999")
        .set("Authorization", `Bearer ${tokenDona}`)
        .send({ preco: 150 })
        .expect(404);

      expect(resposta.body.mensagem).toBe("Produto nao encontrado.");
    });
  });

  describe("DELETE /produtos/:id", () => {
    test("dona da peça consegue inativar", async () => {
      const { produto, tokenDona } = await cenario();

      await request(app)
        .delete(`/produtos/${produto.id}`)
        .set("Authorization", `Bearer ${tokenDona}`)
        .expect(200);
    });

    test("artesã de outra loja recebe 403", async () => {
      const { produto, tokenOutra } = await cenario();

      const resposta = await request(app)
        .delete(`/produtos/${produto.id}`)
        .set("Authorization", `Bearer ${tokenOutra}`)
        .expect(403);

      expect(resposta.body.mensagem).toBe("Voce so pode inativar suas proprias pecas.");
    });

    test("peça inexistente retorna 404", async () => {
      const { tokenDona } = await cenario();

      await request(app)
        .delete("/produtos/999999")
        .set("Authorization", `Bearer ${tokenDona}`)
        .expect(404);
    });
  });

  describe("PUT /produtos/artesao/pecas/:id/estoque", () => {
    test("dona da peça consegue atualizar o estoque", async () => {
      const { produto, tokenDona } = await cenario();

      const resposta = await request(app)
        .put(`/produtos/artesao/pecas/${produto.id}/estoque`)
        .set("Authorization", `Bearer ${tokenDona}`)
        .send({ estoque: 7, situacao: "ATIVO" })
        .expect(200);

      expect(resposta.body.estoque).toBe(7);
    });

    test("artesã de outra loja recebe 403", async () => {
      const { produto, tokenOutra } = await cenario();

      const resposta = await request(app)
        .put(`/produtos/artesao/pecas/${produto.id}/estoque`)
        .set("Authorization", `Bearer ${tokenOutra}`)
        .send({ estoque: 0, situacao: "ESGOTADO" })
        .expect(403);

      expect(resposta.body.mensagem).toBe("Acesso negado.");
    });

    test("peça inexistente retorna 404", async () => {
      const { tokenDona } = await cenario();

      await request(app)
        .put("/produtos/artesao/pecas/999999/estoque")
        .set("Authorization", `Bearer ${tokenDona}`)
        .send({ estoque: 1, situacao: "ATIVO" })
        .expect(404);
    });
  });
});
