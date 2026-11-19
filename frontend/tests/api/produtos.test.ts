// TC03 e TC05 no nível de API real: vitrine, busca, filtros e detalhe da peça.
import { criarProdutoAprovado, erro, get, registrarELogar } from "./cliente";

type Resumo = {
  id: string;
  nome: string;
  preco: number;
  disponibilidade: string;
  modalidadeProducao: string;
  regiao: { id: string; nome: string };
};
type Paginado = { total: number; pagina: number; limite: number; itens: Resumo[] };
type Detalhe = Resumo & {
  descricao: string;
  estoque: number;
  imagens: string[];
  categoria: { id: string; nome: string };
  tecnica: string | { id: string; nome: string };
};

const ids = (pagina: Paginado) => pagina.itens.map((p) => p.id);

describe("TC03 e TC05 · GET /produtos (backend real)", () => {
  const marcador = `AuditInt${Date.now()}`;
  let prodDisponivel: { id: string; nome: string; preco: number; categoriaId: string };
  let prodVendido: { id: string; nome: string };
  let prodBarato: { id: string; nome: string };

  beforeAll(async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");

    const disponivel = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Vaso ${marcador} Disponível`,
      categoria: `Cat${marcador}`,
      tecnica: `Tec${marcador}`,
      origem: `Regiao${marcador}`,
      preco: 180,
      modalidadeProducao: "PRONTA_ENTREGA",
      estoque: 4,
    });
    const detalhe = await get<Detalhe>(`/produtos/${encodeURIComponent(disponivel.id)}`);
    prodDisponivel = {
      id: disponivel.id,
      nome: disponivel.nome,
      preco: disponivel.preco,
      categoriaId: String(detalhe.corpo.categoria.id),
    };

    const barato = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Pássaro ${marcador} Único`,
      categoria: `Cat${marcador}`,
      tecnica: `Tec${marcador}`,
      origem: `Regiao${marcador}`,
      preco: 65,
      modalidadeProducao: "PECA_UNICA",
      estoque: 1,
    });
    prodBarato = { id: barato.id, nome: barato.nome };

    const vendido = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Matriz ${marcador} Vendida`,
      categoria: `Cat${marcador}`,
      tecnica: `Tec${marcador}`,
      origem: `Regiao${marcador}`,
      preco: 250,
      modalidadeProducao: "PECA_UNICA",
      estoque: 0,
    });
    prodVendido = { id: vendido.id, nome: vendido.nome };
  });

  test("responde 200 no envelope { total, pagina, limite, itens }", async () => {
    const { status, corpo, cabecalhos } = await get<Paginado>("/produtos");

    expect(status).toBe(200);
    expect(cabecalhos.get("content-type")).toContain("application/json");
    expect(corpo.pagina).toBe(1);
    expect(corpo.total).toBeGreaterThanOrEqual(corpo.itens.length);
    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(Object.keys(corpo.itens[0])).toEqual(
      expect.arrayContaining(["id", "nome", "preco", "imagemPrincipal", "artesao", "disponibilidade"]),
    );
  });

  test("disponivel=true e destaque=true excluem a peça vendida (estoque 0)", async () => {
    const disp = await get<Paginado>(`/produtos?disponivel=true&termo=${marcador}&limite=50`);
    const dest = await get<Paginado>("/produtos?destaque=true&limite=50");

    expect(ids(disp.corpo)).toContain(prodDisponivel.id);
    expect(ids(disp.corpo)).not.toContain(prodVendido.id);
    expect(disp.corpo.itens.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
    expect(dest.corpo.itens.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
  });

  test("busca por peça vendida não a exibe no catálogo", async () => {
    const { status, corpo } = await get<Paginado>(`/produtos?termo=${encodeURIComponent(prodVendido.nome)}`);

    expect(status).toBe(200);
    expect(ids(corpo)).not.toContain(prodVendido.id);
    expect(corpo.total).toBe(0);
  });

  test("busca sem resultado devolve envelope vazio", async () => {
    const { status, corpo } = await get<Paginado>("/produtos?termo=termo-inexistente-origem-xyz");

    expect(status).toBe(200);
    expect(corpo).toMatchObject({ total: 0, pagina: 1, itens: [] });
  });

  test("filtro de categoria funciona tanto por ID numérico quanto por nome", async () => {
    const porId = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(prodDisponivel.categoriaId)}&limite=50`);
    const porNome = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(`Cat${marcador}`)}&limite=50`);

    expect(ids(porId.corpo)).toContain(prodDisponivel.id);
    expect(ids(porNome.corpo)).toContain(prodDisponivel.id);
  });

  test("filtros de técnica, região/origem, preço máximo e peça única", async () => {
    const tec = await get<Paginado>(`/produtos?tecnica=${encodeURIComponent(`Tec${marcador}`)}&limite=50`);
    const reg = await get<Paginado>(`/produtos?regiao=${encodeURIComponent(`Regiao${marcador}`)}&limite=50`);
    const orig = await get<Paginado>(`/produtos?origem=${encodeURIComponent(`Regiao${marcador}`)}&limite=50`);
    const preco = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(prodDisponivel.categoriaId)}&precoMax=70&limite=50`);
    const unica = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(prodDisponivel.categoriaId)}&pecaUnica=true&limite=50`);

    expect(ids(tec.corpo)).toContain(prodDisponivel.id);
    expect(ids(reg.corpo)).toContain(prodDisponivel.id);
    expect(ids(orig.corpo)).toContain(prodDisponivel.id);
    expect(ids(preco.corpo)).toContain(prodBarato.id);
    expect(ids(preco.corpo)).not.toContain(prodDisponivel.id);
    expect(unica.corpo.itens.every((p) => p.modalidadeProducao === "PECA_UNICA")).toBe(true);
  });

  test.each(["tecnica", "regiao", "origem"])("%s inexistente devolve envelope vazio", async (filtro) => {
    const { status, corpo } = await get<Paginado>(`/produtos?${filtro}=valor-que-nao-existe-xyz`);

    expect(status).toBe(200);
    expect(corpo).toMatchObject({ total: 0, itens: [] });
  });

  test("ordenar por menor-preco e maior-preco e paginação com limite máximo 50", async () => {
    const menor = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(prodDisponivel.categoriaId)}&ordenar=menor-preco&limite=50`);
    const maior = await get<Paginado>(`/produtos?categoria=${encodeURIComponent(prodDisponivel.categoriaId)}&ordenar=maior-preco&limite=50`);
    const p1 = await get<Paginado>("/produtos?limite=2&pagina=1");
    const p2 = await get<Paginado>("/produtos?limite=2&pagina=2");
    const enorme = await get<Paginado>("/produtos?limite=500");

    expect(menor.corpo.itens[0].preco).toBeLessThanOrEqual(menor.corpo.itens[menor.corpo.itens.length - 1].preco);
    expect(maior.corpo.itens[0].preco).toBeGreaterThanOrEqual(maior.corpo.itens[maior.corpo.itens.length - 1].preco);
    expect(p2.corpo.pagina).toBe(2);
    expect(ids(p1.corpo).filter((id) => ids(p2.corpo).includes(id))).toEqual([]);
    expect(enorme.corpo.limite).toBe(50);
  });

  test("GET /produtos/{id} retorna detalhe real para disponível e vendido e 404 para inexistente", async () => {
    const disp = await get<Detalhe>(`/produtos/${encodeURIComponent(prodDisponivel.id)}`);
    const vend = await get<Detalhe>(`/produtos/${encodeURIComponent(prodVendido.id)}`);
    const inex = await get("/produtos/9999999");
    const avls = await get(`/avaliacoes/produtos/${encodeURIComponent(prodDisponivel.id)}/avaliacoes`);

    expect(disp.status).toBe(200);
    expect(disp.corpo).toMatchObject({
      id: prodDisponivel.id,
      nome: prodDisponivel.nome,
      disponibilidade: "DISPONIVEL",
      estoque: 4,
    });
    expect(vend.status).toBe(200);
    expect(vend.corpo.disponibilidade).toBe("VENDIDO");
    expect(inex.status).toBe(404);
    expect(inex.corpo).toEqual(erro("Produto nao encontrado."));
    expect(avls.status).toBe(200);
  });
});
