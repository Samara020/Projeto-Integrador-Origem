import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCategoria,
  criarEndereco,
  criarLoja,
  criarPedido,
  criarProduto,
  criarUsuario,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

const autorizacaoDe = (id: number, papel: string) => ({
  Authorization: `Bearer ${gerarToken(id, papel)}`,
});

async function produtoPendente(nome = "Peça em auditoria") {
  const categoria = await criarCategoria();
  const artesao = await criarUsuarioArtesao();
  const loja = await criarLoja(artesao.id);
  const produto = await criarProduto(categoria.id, loja.id, { nome });
  await prisma.produto.update({
    where: { id: produto.id },
    data: { statusValidacao: "PENDENTE", seloAtivo: false },
  });
  return { categoria, artesao, loja, produto };
}

describe("Contrato canônico — TC17 validação administrativa", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("aprovação pela rota canônica muda estado, ativa selo e registra auditoria", async () => {
    const { produto } = await produtoPendente();
    const admin = await criarUsuario("ADMINISTRADOR");
    const auth = autorizacaoDe(admin.id, "ADMINISTRADOR");

    const fila = await request(app)
      .get("/admin/produtos/pendentes?status=PENDENTE")
      .set(auth)
      .expect(200);

    const pendente = fila.body.itens.find(
      (item: { id: string | number }) => String(item.id) === String(produto.id),
    );
    expect(pendente).toBeDefined();
    expect(pendente.statusValidacao).toBe("PENDENTE");

    // Produto pendente não pode ser exposto publicamente.
    await request(app).get(`/produtos/${produto.id}`).expect(404);

    const decisao = await request(app)
      .put(`/admin/produtos/${produto.id}/validacao`)
      .set(auth)
      .send({ status: "APROVADA", justificativa: "Origem comprovada." })
      .expect(200);

    expect(Number(decisao.body.id)).toBe(produto.id);
    expect(decisao.body.statusValidacao).toBe("APROVADA");
    expect(decisao.body.seloAtivo).toBe(true);

    const publico = await request(app).get(`/produtos/${produto.id}`).expect(200);
    expect(publico.body.statusValidacao).toBe("APROVADA");
    expect(publico.body.seloAtivo).toBe(true);

    const auditada = await request(app)
      .get("/admin/produtos/pendentes?status=APROVADA")
      .set(auth)
      .expect(200);

    const item = auditada.body.itens.find(
      (registro: { id: string | number }) => String(registro.id) === String(produto.id),
    );
    expect(item).toBeDefined();
    expect(item.justificativa).toBe("Origem comprovada.");
    expect(Number(item.decididoPorId)).toBe(admin.id);
    expect(item.decididoEm).toBeTruthy();
  });

  test("reprovação pela rota legada não concede selo e preserva auditoria", async () => {
    const { produto } = await produtoPendente();
    const admin = await criarUsuario("ADMINISTRADOR");
    const auth = autorizacaoDe(admin.id, "ADMINISTRADOR");

    const decisao = await request(app)
      .put(`/produtos/admin/produtos/${produto.id}/validacao`)
      .set(auth)
      .send({ status: "REPROVADA", justificativa: "Documentação insuficiente." })
      .expect(200);

    expect(decisao.body.statusValidacao).toBe("REPROVADA");
    expect(decisao.body.seloAtivo).toBe(false);

    await request(app).get(`/produtos/${produto.id}`).expect(404);

    const fila = await request(app)
      .get("/admin/produtos/pendentes?status=REPROVADA")
      .set(auth)
      .expect(200);

    const item = fila.body.itens.find(
      (registro: { id: string | number }) => String(registro.id) === String(produto.id),
    );
    expect(item).toBeDefined();
    expect(item.justificativa).toBe("Documentação insuficiente.");
    expect(Number(item.decididoPorId)).toBe(admin.id);
  });

  test("autorização e validação valem nos dois prefixos", async () => {
    const { produto } = await produtoPendente();
    const comprador = await criarUsuarioComprador();
    const compradorAuth = autorizacaoDe(comprador.id, "COMPRADOR");

    await request(app)
      .get("/admin/produtos/pendentes")
      .set(compradorAuth)
      .expect(403);
    await request(app)
      .put(`/admin/produtos/${produto.id}/validacao`)
      .set(compradorAuth)
      .send({ status: "APROVADA" })
      .expect(403);
    await request(app)
      .put(`/produtos/admin/produtos/${produto.id}/validacao`)
      .set(compradorAuth)
      .send({ status: "APROVADA" })
      .expect(403);

    await request(app)
      .put(`/admin/produtos/${produto.id}/validacao`)
      .send({ status: "APROVADA" })
      .expect(401);

    const admin = await criarUsuario("ADMINISTRADOR");
    await request(app)
      .put(`/admin/produtos/${produto.id}/validacao`)
      .set(autorizacaoDe(admin.id, "ADMINISTRADOR"))
      .send({ status: "REPROVADA", justificativa: "   " })
      .expect(400);
  });
});

describe("Contrato canônico — TC23 painel do artesão", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("métricas canônicas e legadas isolam lojas e retornam recentes/vazios", async () => {
    const categoria = await criarCategoria();

    // Loja A: um produto, um pedido e uma avaliação recente.
    const artesaoA = await criarUsuarioArtesao();
    const lojaA = await criarLoja(artesaoA.id);
    const produtoA = await criarProduto(categoria.id, lojaA.id, { nome: "Peça da loja A" });
    const comprador = await criarUsuarioComprador();
    const endereco = await criarEndereco();
    await criarPedido(comprador.id, endereco.id, produtoA.id, 1, 100);
    await prisma.avaliacao.create({
      data: {
        nota: 5,
        comentario: "Excelente peça.",
        dataAvaliacao: new Date(),
        status: "PUBLICADO",
        usuarioId: comprador.id,
        produtoId: produtoA.id,
      },
    });

    // Loja B: só produto, sem pedidos nem avaliações (caso vazio).
    const artesaoB = await criarUsuarioArtesao();
    const lojaB = await criarLoja(artesaoB.id);
    await criarProduto(categoria.id, lojaB.id, { nome: "Peça da loja B" });

    // Artesão C: sem loja, deve receber zeros/listas vazias.
    const artesaoC = await criarUsuarioArtesao();

    const authA = autorizacaoDe(artesaoA.id, "ARTESAO");
    const metricasA = await request(app)
      .get("/artesao/painel/metricas")
      .set(authA)
      .expect(200);

    expect(metricasA.body.produtosAtivos).toBe(1);
    expect(metricasA.body.pedidosRecentes).toHaveLength(1);
    expect(metricasA.body.pedidosRecentes[0].comprador).toBe(comprador.nome);
    expect(metricasA.body.avaliacoesRecentes).toHaveLength(1);
    expect(metricasA.body.avaliacoesRecentes[0].produto).toBe("Peça da loja A");
    expect(metricasA.body.avaliacaoMedia).toBe(5);
    expect(metricasA.body.totalAvaliacoes).toBe(1);

    // Prefixo legado devolve o mesmo payload.
    const legadoA = await request(app)
      .get("/painel/artesao/painel/metricas")
      .set(authA)
      .expect(200);
    expect(legadoA.body).toEqual(metricasA.body);

    const metricasB = await request(app)
      .get("/artesao/painel/metricas")
      .set(autorizacaoDe(artesaoB.id, "ARTESAO"))
      .expect(200);

    expect(metricasB.body.produtosAtivos).toBe(1);
    expect(metricasB.body.pedidosRecentes).toEqual([]);
    expect(metricasB.body.avaliacoesRecentes).toEqual([]);
    expect(metricasB.body.totalAvaliacoes).toBe(0);

    const metricasC = await request(app)
      .get("/artesao/painel/metricas")
      .set(autorizacaoDe(artesaoC.id, "ARTESAO"))
      .expect(200);

    expect(metricasC.body.produtosAtivos).toBe(0);
    expect(metricasC.body.pedidosRecentes).toEqual([]);
    expect(metricasC.body.avaliacoesRecentes).toEqual([]);

    // Comprador não acessa painel de artesão em nenhum dos prefixos.
    const compradorAuth = autorizacaoDe(comprador.id, "COMPRADOR");
    await request(app)
      .get("/artesao/painel/metricas")
      .set(compradorAuth)
      .expect(403);
    await request(app)
      .get("/painel/artesao/painel/metricas")
      .set(compradorAuth)
      .expect(403);
  });
});
