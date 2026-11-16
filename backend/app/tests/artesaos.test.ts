import request from "supertest";
import { criarApp } from "../src/index";
import {
  criarLoja,
  criarUsuarioArtesao,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

describe("Artesãos - endpoints de perfil", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("GET /artesaos/artesao/perfil retorna o perfil do artesão autenticado", async () => {
    const artesao = await criarUsuarioArtesao();
    await criarLoja(artesao.id, "Ateliê Barro Vivo");
    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .get("/artesaos/artesao/perfil")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(resposta.body.nomeArtistico).toBe("Ateliê Barro Vivo");
  });

  test("GET /artesao/perfil retorna o perfil via rota direta do contrato", async () => {
    const artesao = await criarUsuarioArtesao();
    await criarLoja(artesao.id, "Ateliê Barro Vivo");
    const token = gerarToken(artesao.id, "ARTESAO");

    const resposta = await request(app)
      .get("/artesao/perfil")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(resposta.body.nomeArtistico).toBe("Ateliê Barro Vivo");
  });

  test("GET /artesaos/:id/perfil retorna o perfil público de um artesão", async () => {
    const artesao = await criarUsuarioArtesao();
    await criarLoja(artesao.id, "Ateliê Barro Vivo");

    const resposta = await request(app)
      .get(`/artesaos/${artesao.id}/perfil`)
      .expect(200);

    expect(String(resposta.body.id)).toBe(String(artesao.id));
    expect(resposta.body.nomeLoja).toBe("Ateliê Barro Vivo");
  });
});
