// TC02 e TC12: cadastro de peça com e sem os campos obrigatórios
// (painelArtesaoService.criarPeca, services/painelArtesao.ts).
import { ApiError } from "@/lib/http";
import { painelArtesaoService } from "@/services/painelArtesao";
import type { NovoProduto, PecaEstoque } from "@/types";
import { gravar, lerGravado } from "./apoio";

const PECA: NovoProduto = {
  nome: "  Bilro de Teste  ",
  descricao: "Renda de bilro feita para o teste automatizado.",
  categoria: "artesanato",
  tecnica: "renda-de-bilro",
  material: "Linha de algodão",
  dimensoes: "30 x 30 cm",
  peso: 0.2,
  origem: "Agreste",
  preco: 90,
  modalidadeProducao: "PRONTA_ENTREGA",
  estoque: 5,
  informacoesOrigem: "Feita em Caruaru.",
  certificado: "",
  imagens: ["/imagens/bilro.jpg"],
};

const pecasNovas = () => lerGravado<PecaEstoque[]>("painel-artesao:pecas:novas");

beforeEach(() => {
  window.localStorage.clear();
});

describe("TC12 · cadastro sem campo obrigatório é recusado", () => {
  test.each([
    ["nome vazio", { ...PECA, nome: "" }, "Dê um nome à peça."],
    ["nome só com espaços", { ...PECA, nome: "   " }, "Dê um nome à peça."],
    ["preço zero", { ...PECA, preco: 0 }, "Informe o preço da peça."],
    ["preço negativo", { ...PECA, preco: -1 }, "Informe o preço da peça."],
    ["sem foto", { ...PECA, imagens: [] }, "Adicione ao menos uma foto."],
  ])("%s: 400 e nada gravado", async (_caso, peca, mensagem) => {
    const tentativa = painelArtesaoService.criarPeca(peca);

    await expect(tentativa).rejects.toBeInstanceOf(ApiError);
    await expect(tentativa).rejects.toMatchObject({ status: 400, message: mensagem });
    expect(pecasNovas()).toBeNull();
  });

  test("preço mínimo positivo passa (valor-limite)", async () => {
    await expect(painelArtesaoService.criarPeca({ ...PECA, preco: 0.01 })).resolves.toMatchObject({
      statusValidacao: "PENDENTE",
    });
  });
});

describe("TC02 · cadastro com os campos obrigatórios", () => {
  test("cria a peça pendente de validação, com id e SKU novos", async () => {
    const criada = await painelArtesaoService.criarPeca(PECA);

    expect(criada).toMatchObject({ id: "prd_400", sku: "ORG-NOV-400", statusValidacao: "PENDENTE" });
    expect(Number.isNaN(Date.parse(criada.criadoEm))).toBe(false);
  });

  test("grava a peça no estoque do artesão com nome sem espaços nas pontas e a primeira foto", async () => {
    await painelArtesaoService.criarPeca({ ...PECA, imagens: ["/imagens/bilro.jpg", "/imagens/verso.jpg"] });

    expect(pecasNovas()).toEqual([
      {
        id: "prd_400",
        nome: "Bilro de Teste",
        sku: "ORG-NOV-400",
        imagemPrincipal: "/imagens/bilro.jpg",
        estoque: 5,
        situacao: "ATIVO",
      },
    ]);
  });

  test("a segunda peça recebe o número seguinte e entra no topo da lista", async () => {
    await painelArtesaoService.criarPeca(PECA);
    await painelArtesaoService.criarPeca({ ...PECA, nome: "Segunda peça" });

    expect(pecasNovas()?.map((peca) => peca.id)).toEqual(["prd_401", "prd_400"]);
  });

  test.each([
    [0, "ESGOTADO"],
    [1, "ESTOQUE_BAIXO"],
    [2, "ESTOQUE_BAIXO"],
    [3, "ATIVO"],
  ])("estoque %i gera a situação %s", async (estoque, situacao) => {
    await painelArtesaoService.criarPeca({ ...PECA, estoque });

    expect(pecasNovas()?.[0].situacao).toBe(situacao);
  });

  test("publicar apaga o rascunho salvo", async () => {
    gravar("painel-artesao:rascunho", PECA);
    expect(painelArtesaoService.rascunho()).not.toBeNull();

    await painelArtesaoService.criarPeca(PECA);

    expect(painelArtesaoService.rascunho()).toBeNull();
  });
});
