import request from "supertest";
import { criarApp } from "../src/index";
import {
  criarUsuario,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

describe("TC24 / DEF04 · listagens completas de usuários e artesãos no painel admin", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("expõe todos os cadastros, inclusive artesão fora dos 10 recentes, sem credenciais", async () => {
    // Alvo criado primeiro: fica fora do recorte de 10 recentes (ordem decrescente de id).
    const alvo = await criarUsuarioArtesao();
    for (let i = 0; i < 10; i += 1) {
      await criarUsuario(i % 2 === 0 ? "COMPRADOR" : "ARTESAO");
    }
    const admin = await criarUsuario("ADMINISTRADOR");

    const resposta = await request(app)
      .get("/admin/painel/metricas")
      .set({ Authorization: `Bearer ${gerarToken(admin.id, "ADMINISTRADOR")}` })
      .expect(200);

    expect(resposta.body.usuariosCadastrados).toHaveLength(12);
    expect(resposta.body.artesaosCadastrados).toHaveLength(6);
    expect(
      resposta.body.artesaosCadastrados.every(
        (usuario: { papel: string }) => usuario.papel === "ARTESAO",
      ),
    ).toBe(true);

    expect(
      resposta.body.usuariosRecentes.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(false);
    expect(
      resposta.body.usuariosCadastrados.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(true);
    expect(
      resposta.body.artesaosCadastrados.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(true);

    // Lista de consulta não pode carregar senha, hash ou token.
    const entrada = resposta.body.usuariosCadastrados.find(
      (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
    );
    expect(entrada).toBeDefined();
    expect(Object.keys(entrada!).sort()).toEqual(["id", "nome", "papel"]);
  });

  test("mantém o painel restrito a administrador autenticado", async () => {
    const comprador = await criarUsuarioComprador();

    await request(app).get("/admin/painel/metricas").expect(401);
    await request(app)
      .get("/admin/painel/metricas")
      .set({ Authorization: `Bearer ${gerarToken(comprador.id, "COMPRADOR")}` })
      .expect(403);
  });
});
