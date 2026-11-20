/// <reference types="jest" />

import request from "supertest";
import * as bcrypt from "bcryptjs";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import { limparBanco } from "./helpers";

const app = criarApp();
const CODIGO_CONVITE_TESTE = "origem-admin-convite-teste";

describe("Autenticação - cadastro e login", () => {
  beforeAll(() => {
    process.env.ADMIN_INVITE_CODE = CODIGO_CONVITE_TESTE;
  });

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
          codigoConvite: CODIGO_CONVITE_TESTE,
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

    test("não deve cadastrar com nome vazio ou contendo apenas espaços", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: "   ",
          email: "nomevazio@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(400);
    });

    test("não deve cadastrar com nome de tipo não-string", async () => {
      await request(app)
        .post("/auth/register")
        .send({
          nome: 12345,
          email: "nometipo@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(400);
    });

    test("não deve cadastrar com e-mail de formato inválido ou tipo incorreto", async () => {
      const emailsInvalidos = [
        "sem-arroba",
        "semdominio@",
        "@semusuario.com",
        "invalido com espacos@test.com",
        "   ",
        12345,
        null,
      ];

      for (const email of emailsInvalidos) {
        await request(app)
          .post("/auth/register")
          .send({
            nome: "Comprador Valido",
            email,
            senha: "senha123",
            papel: "COMPRADOR",
          })
          .expect(400);
      }
    });

    test("deve salvar nome com trim aplicado", async () => {
      const resposta = await request(app)
        .post("/auth/register")
        .send({
          nome: "   Nome Com Espacos   ",
          email: "trim.nome@test.com",
          senha: "senha123",
          papel: "COMPRADOR",
        })
        .expect(201);

      expect(resposta.body.nome).toBe("Nome Com Espacos");
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
});
