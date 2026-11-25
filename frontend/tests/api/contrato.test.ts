// Testes de contrato da API real contra docs/ContratoDeAPI.md, em três formatos:
// o modelo de produto (GET /produtos/{id}), a lista paginada (GET /produtos) e o erro.
// Conferem a forma da resposta (campos e tipos), não a regra de negócio: quem mudar o
// formato sem atualizar o contrato quebra estes testes.
// O contrato não descreve o corpo do erro; o formato { mensagem } é o que a API padronizou
// e o que o frontend lê (ver docs/testes/suite-de-api.md).
import { criarProdutoAprovado, get, post, registrarELogar } from "./cliente";

type Json = Record<string, unknown>;

const MODALIDADES = ["PRONTA_ENTREGA", "PECA_UNICA", "SOB_ENCOMENDA"];

function esperaResumoDeProduto(item: Json) {
  // Padrões gerais do contrato: ids inteiros do PostgreSQL saem como texto.
  expect(typeof item.id).toBe("string");
  expect(item.id).toMatch(/^\d+$/);
  expect(typeof item.nome).toBe("string");
  expect(typeof item.preco).toBe("number");
  expect(typeof item.seloAtivo).toBe("boolean");
  expect(item).toHaveProperty("imagemPrincipal");
  const artesao = item.artesao as Json;
  expect(typeof artesao.id).toBe("string");
  expect(typeof artesao.nome).toBe("string");
}

function esperaErroPadrao(resposta: { status: number; corpo: unknown; cabecalhos: Headers }, status: number) {
  expect(resposta.status).toBe(status);
  expect(resposta.cabecalhos.get("content-type")).toMatch(/^application\/json/);
  const corpo = resposta.corpo as Json;
  expect(Object.keys(corpo)).toEqual(["mensagem"]);
  expect(typeof corpo.mensagem).toBe("string");
  expect((corpo.mensagem as string).length).toBeGreaterThan(0);
}

describe("Contrato · lista paginada de GET /produtos", () => {
  it("devolve o envelope total, pagina, limite e itens, com o resumo de cada peça", async () => {
    const resposta = await get<Json>("/produtos?pagina=1&limite=10");

    expect(resposta.status).toBe(200);
    expect(resposta.cabecalhos.get("content-type")).toMatch(/^application\/json/);
    expect(Object.keys(resposta.corpo).sort()).toEqual(["itens", "limite", "pagina", "total"]);
    expect(resposta.corpo.pagina).toBe(1);
    expect(resposta.corpo.limite).toBe(10);
    expect(Number.isInteger(resposta.corpo.total)).toBe(true);
    const itens = resposta.corpo.itens as Json[];
    expect(Array.isArray(itens)).toBe(true);
    expect(itens.length).toBeLessThanOrEqual(10);
    expect(itens.length).toBeGreaterThan(0);
    itens.forEach(esperaResumoDeProduto);
  });

  it("limite acima de 50 é reduzido para 50 (valor-limite do contrato)", async () => {
    const noLimite = await get<Json>("/produtos?limite=50");
    const acima = await get<Json>("/produtos?limite=51");

    expect(noLimite.corpo.limite).toBe(50);
    expect(acima.status).toBe(200);
    expect(acima.corpo.limite).toBe(50);
  });

  it("página além do fim devolve lista vazia com o mesmo envelope, sem erro", async () => {
    const resposta = await get<Json>("/produtos?pagina=99999&limite=5");

    expect(resposta.status).toBe(200);
    expect(resposta.corpo.pagina).toBe(99999);
    expect(resposta.corpo.itens).toEqual([]);
    expect(Number.isInteger(resposta.corpo.total)).toBe(true);
  });
});

describe("Contrato · modelo de produto em GET /produtos/{id}", () => {
  let produto: { id: string; nome: string; preco: number };

  beforeAll(async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    produto = await criarProdutoAprovado(artesao.token, admin.token, { nome: `Peça Contrato ${Date.now()}`, preco: 380 });
  });

  it("devolve os campos do contrato com os tipos esperados", async () => {
    const resposta = await get<Json>(`/produtos/${produto.id}`);

    expect(resposta.status).toBe(200);
    expect(resposta.corpo.id).toBe(produto.id);
    expect(resposta.corpo.nome).toBe(produto.nome);
    expect(resposta.corpo.preco).toBe(380);
    expect(resposta.corpo.statusValidacao).toBe("APROVADA");
    expect(MODALIDADES).toContain(resposta.corpo.modalidadeProducao);
    expect(typeof resposta.corpo.seloAtivo).toBe("boolean");
    const artesao = resposta.corpo.artesao as Json;
    expect(typeof artesao.id).toBe("string");
    expect(typeof artesao.nome).toBe("string");
    expect(artesao).toHaveProperty("loja");
  });

  it("a mesma peça aparece na lista com o resumo coerente com o detalhe", async () => {
    const lista = await get<{ itens: Json[] }>(`/produtos?termo=${encodeURIComponent(produto.nome)}&limite=5`);

    const naLista = lista.corpo.itens.find((item) => item.id === produto.id);
    expect(naLista).toBeDefined();
    esperaResumoDeProduto(naLista as Json);
    expect((naLista as Json).preco).toBe(380);
  });
});

describe("Contrato · formato de erro", () => {
  it("404 de peça inexistente traz só o campo mensagem", async () => {
    esperaErroPadrao(await get("/produtos/999999999"), 404);
  });

  it("404 de rota inexistente usa o mesmo formato", async () => {
    esperaErroPadrao(await get("/rota-que-nao-existe"), 404);
  });

  it("401 de rota protegida sem token usa o mesmo formato", async () => {
    esperaErroPadrao(await get("/comprador/pedidos"), 401);
  });

  it("400 de corpo inválido usa o mesmo formato", async () => {
    esperaErroPadrao(await post("/auth/login", {}), 400);
  });

  it("403 de perfil sem permissão usa o mesmo formato e não cria nada", async () => {
    const comprador = await registrarELogar("COMPRADOR");
    const nome = `Peça Proibida ${Date.now()}`;

    const resposta = await post("/produtos", { nome, descricao: "Tentativa de cadastro por comprador.", preco: 10 }, { token: comprador.token });

    esperaErroPadrao(resposta, 403);
    const busca = await get<{ total: number }>(`/produtos?termo=${encodeURIComponent(nome)}`);
    expect(busca.corpo.total).toBe(0);
  });
});
