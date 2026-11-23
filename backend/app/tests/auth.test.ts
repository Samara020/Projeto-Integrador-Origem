import { describe, beforeEach, afterAll, test, expect } from "@jest/globals";

import request from "supertest";
import * as bcrypt from "bcryptjs";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import { limparBanco } from "./helpers";

const app = criarApp();

describe("Autenticação - cadastro e login", () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
  });

  describe("POST /auth/register", () => {
    test("deve cadastrar um comprador com senha criptografada", async () => {
      const resposta = await request(app)
        .post("/auth/register")
        .send({
          nome: "Comprador Teste",
          email: "comprador@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(201);

      expect(resposta.body.email).toBe("comprador@test.com");

      const usuario = await prisma.usuario.findUnique({
        where: { email: "comprador@test.com" },
      });

      expect(usuario).not.toBeNull();
      expect(usuario!.senha).not.toBe("senha123");
      expect(await bcrypt.compare("senha123", usuario!.senha)).toBe(true);
    });

    test("deve cadastrar um artesão", async () => {
      const resposta = await request(app)
        .post("/auth/register")
        .send({
          nome: "Artesão Teste",
          email: "artesao@test.com",
          senha: "senha123",
          papel: "ARTESAO",
        })
        .expect(201);

      expect(resposta.body.papel).toBe("ARTESAO");
    });

    test("deve cadastrar administrador com convite válido", async () => {
      const resposta = await request(app)
        .post("/auth/register")
        .send({
          nome: "Administrador Teste",
          email: "admin@test.com",
          senha: "senha123",
          papel: "ADMINISTRADOR",
          codigoConvite: "origem-admin-2026",
        })
        .expect(201);

      expect(resposta.body.papel).toBe("ADMINISTRADOR");
    });

    test("não deve cadastrar administrador com convite inválido", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Administrador Teste",
          email: "admin@test.com",
          senha: "senha123",
          papel: "ADMINISTRADOR",
          codigoConvite: "convite-invalido",
        })
        .expect(403);
    });

    test("não deve cadastrar administrador sem convite", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Administrador Teste",
          email: "admin@test.com",
          senha: "senha123",
          papel: "ADMINISTRADOR",
        })
        .expect(403);
    });

    test("não deve cadastrar e-mail duplicado", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Primeiro Comprador",
          email: "duplicado@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(201);

      await request(app)
        .post("/auth/register")
        .send({
          nome: "Segundo Comprador",
          email: "duplicado@test.com",
          senha: "senha456",
          papel: "COMPRADOR",
        })
        .expect(400);
    });

    test("não deve aceitar senha com menos de oito caracteres", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Comprador Teste",
          email: "curta@test.com",
          senha: "1234567",
          papel: "COMPRADOR",
        })
        .expect(400);
    });

    test("não deve aceitar e-mail com formato inválido", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Comprador Teste",
          email: "email-invalido-sem-arroba",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(400);
    });

    test("não deve aceitar papel inválido", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Usuário Teste",
          email: "invalido@test.com",
          senha: "senha123",
          papel: "SUPERADMIN",
        })
        .expect(400);
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Comprador Teste",
          email: "login@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(201);
    });

    test("deve realizar login com credenciais corretas", async () => {
      const resposta = await request(app)
        .post("/auth/login")
        .send({
          email: "login@test.com",
          senha: "senha123",
        })
        .expect(200);

      expect(resposta.body.token).toBeDefined();
      expect(resposta.body.tipo).toBe("Bearer");
      expect(resposta.body.usuario.email).toBeUndefined();
      expect(resposta.body.usuario.papel).toBe("COMPRADOR");
    });

    test("deve rejeitar senha incorreta", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "login@test.com",
          senha: "senhaerrada",
        })
        .expect(401);
    });

    test("deve rejeitar e-mail inexistente", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "inexistente@test.com",
          senha: "senha123",
        })
        .expect(401);
    });

    test("deve aceitar e-mail com letras maiúsculas", async () => {
      await request(app)
        .post("/auth/login")
        .send({
          email: "LOGIN@TEST.COM",
          senha: "senha123",
        })
        .expect(200);
    });

    test("TC11 · bloqueia temporariamente com 429 após 5 tentativas inválidas e libera após expiração", async () => {
      for (let i = 0; i < 5; i += 1) {
        await request(app)
          .post("/auth/login")
          .send({ email: "login@test.com", senha: `errada-${i}` })
          .expect(401);
      }

      const registro = await prisma.tentativaLogin.findUnique({
        where: { email: "login@test.com" },
      });
      expect(registro).not.toBeNull();
      expect(registro!.tentativas).toBe(5);
      expect(registro!.bloqueadoAte).not.toBeNull();

      // 6ª tentativa bloqueada mesmo com a senha correta
      const bloqueado = await request(app)
        .post("/auth/login")
        .send({ email: "login@test.com", senha: "senha123" })
        .expect(429);

      expect(bloqueado.body.mensagem).toMatch(/temporariamente bloqueada/i);
      expect(Number(bloqueado.headers["retry-after"])).toBeGreaterThan(0);

      // Após expiração da janela de bloqueio, login volta a funcionar e zera o registro
      await prisma.tentativaLogin.update({
        where: { email: "login@test.com" },
        data: { bloqueadoAte: new Date(Date.now() - 1000) },
      });

      const desbloqueado = await request(app)
        .post("/auth/login")
        .send({ email: "login@test.com", senha: "senha123" })
        .expect(200);

      expect(desbloqueado.body.token).toBeDefined();
      const limpo = await prisma.tentativaLogin.findUnique({
        where: { email: "login@test.com" },
      });
      expect(limpo).toBeNull();
    });

    test("TC11 · login bem-sucedido antes do limite zera o contador de falhas", async () => {
      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post("/auth/login")
          .send({ email: "login@test.com", senha: "errada" })
          .expect(401);
      }

      await request(app)
        .post("/auth/login")
        .send({ email: "login@test.com", senha: "senha123" })
        .expect(200);

      // Mais 3 falhas não devem disparar bloqueio imediato pois o contador foi zerado
      for (let i = 0; i < 3; i += 1) {
        await request(app)
          .post("/auth/login")
          .send({ email: "login@test.com", senha: "errada" })
          .expect(401);
      }
    });
  });

  describe("Migração de senhas antigas", () => {
    test("deve converter senha antiga em hash após login bem-sucedido", async () => {
      await prisma.usuario.create({
        data: {
          nome: "Usuário Antigo",
          email: "antigo@test.com",
          senha: "senha123",
          usuarioTipo: "COMPRADOR",
        },
      });

      await request(app)
        .post("/auth/login")
        .send({
          email: "antigo@test.com",
          senha: "senha123",
        })
        .expect(200);

      const usuarioAtualizado = await prisma.usuario.findUnique({
        where: { email: "antigo@test.com" },
      });

      expect(usuarioAtualizado).not.toBeNull();
      expect(usuarioAtualizado!.senha).not.toBe("senha123");
      expect(
        await bcrypt.compare("senha123", usuarioAtualizado!.senha)
      ).toBe(true);
    });

    test("não deve alterar senha antiga quando a senha informada estiver incorreta", async () => {
      await prisma.usuario.create({
        data: {
          nome: "Usuário Antigo",
          email: "antigo2@test.com",
          senha: "senha123",
          usuarioTipo: "COMPRADOR",
        },
      });

      await request(app)
        .post("/auth/login")
        .send({
          email: "antigo2@test.com",
          senha: "senhaerrada",
        })
        .expect(401);

      const usuario = await prisma.usuario.findUnique({
        where: { email: "antigo2@test.com" },
      });

      expect(usuario!.senha).toBe("senha123");
    });
  });

 describe("Logout e invalidação de token", () => {
    test("deve revogar o token no logout e bloquear requisições seguintes com 401", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "Usuário Logout",
          email: "logout@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(201);

      const login = await request(app)
        .post("/auth/login")
        .send({
          email: "logout@test.com",
          senha: "senha123",
        })
        .expect(200);

      const token = login.body.token;

      await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);
    });
  });
});