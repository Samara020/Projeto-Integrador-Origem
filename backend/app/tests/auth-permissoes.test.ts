/// <reference types="jest" />

import request from "supertest";
import jwt from "jsonwebtoken";
import { criarApp } from "../src/index";
import {
  criarUsuario,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

const tokenExpirado = () =>
  jwt.sign(
    { id: "1", papel: "ARTESAO" },
    process.env.JWT_SECRET ?? "test_secret",
    { expiresIn: "-1h" }
  );

describe("Autorização e permissões por perfil", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
  });

  describe("Autenticação", () => {
    test("deve retornar 401 quando não houver token", async () => {
      await request(app)
        .get("/artesaos/artesao/perfil")
        .expect(401);
    });

    test("deve retornar 401 quando o token for inválido", async () => {
      await request(app)
        .get("/artesaos/artesao/perfil")
        .set("Authorization", "Bearer token-invalido")
        .expect(401);
    });

    test("TC15 · deve retornar 401 quando o token estiver expirado", async () => {
      await request(app)
        .get("/artesaos/artesao/perfil")
        .set("Authorization", `Bearer ${tokenExpirado()}`)
        .expect(401);
    });
  });

  describe("Permissões de artesão", () => {
    test("deve permitir acesso ao artesão", async () => {
      const token = gerarToken("1", "ARTESAO");

      await request(app)
        .get("/painel/artesao/envio/configuracoes")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    test("deve bloquear comprador", async () => {
      const token = gerarToken("1", "COMPRADOR");

      await request(app)
        .get("/artesaos/artesao/perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    test("deve bloquear administrador", async () => {
      const token = gerarToken("1", "ADMINISTRADOR");

      await request(app)
        .get("/artesaos/artesao/perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });
  });

  describe("Permissões de comprador", () => {
    test("deve bloquear artesão", async () => {
      const token = gerarToken("1", "ARTESAO");

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    test("deve bloquear administrador", async () => {
      const token = gerarToken("1", "ADMINISTRADOR");

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    test("deve permitir acesso ao comprador", async () => {
      const comprador = await criarUsuarioComprador();
      const token = gerarToken(comprador.id, "COMPRADOR");

      await request(app)
        .get("/carrinho")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
  });

  describe("Permissões de administrador", () => {
    test("deve bloquear comprador", async () => {
      const token = gerarToken("1", "COMPRADOR");

      await request(app)
        .get("/painel/admin/perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    test("deve bloquear artesão", async () => {
      const token = gerarToken("1", "ARTESAO");

      await request(app)
        .get("/painel/admin/perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
    });

    test("deve permitir acesso ao administrador", async () => {
      const administrador = await criarUsuario("ADMINISTRADOR", "Administrador Teste");
      const token = gerarToken(administrador.id, "ADMINISTRADOR");

      await request(app)
        .get("/painel/admin/perfil")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
  });
});
