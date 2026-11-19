// TC04: inclusão, alteração e remoção de itens no carrinho (services/carrinho.ts).
import { carrinhoService } from "@/services/carrinho";
import type { ItemCarrinho, ProdutoResumo } from "@/types";
import { concluir, lerGravado } from "./apoio";

const vaso: ProdutoResumo = {
  id: "1001",
  nome: "Vaso Cerâmica Raízes",
  preco: 160,
  imagemPrincipal: "/produtos/vaso-ceramica.jpg",
  artesao: { id: "1000", nome: "Ana Pereira" },
  seloAtivo: true,
  regiao: { id: "zona-da-mata", nome: "Zona da Mata" },
  modalidadeProducao: "PRONTA_ENTREGA",
  disponibilidade: "DISPONIVEL",
  avaliacaoMedia: 4.8,
};

const luminaria: ProdutoResumo = {
  id: "1002",
  nome: "Luminária Mandacaru",
  preco: 120,
  imagemPrincipal: "/produtos/luminaria-mandacaru.jpg",
  artesao: { id: "1000", nome: "Ana Pereira" },
  seloAtivo: true,
  regiao: { id: "agreste", nome: "Agreste" },
  modalidadeProducao: "PRONTA_ENTREGA",
  disponibilidade: "DISPONIVEL",
  avaliacaoMedia: 4.9,
};

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("TC04 · carrinhoService", () => {
  test("carrinho novo começa vazio, com total zero", async () => {
    await expect(carrinhoService.obter()).resolves.toEqual({ itens: [], valorTotal: 0 });
  });

  test("adicionar inclui o item com nome, imagem e preço da peça", async () => {
    const carrinho = await concluir(carrinhoService.adicionar(vaso, 1));

    expect(carrinho.itens).toEqual([
      {
        produtoId: vaso.id,
        quantidade: 1,
        precoUnitario: vaso.preco,
        nome: vaso.nome,
        imagemPrincipal: vaso.imagemPrincipal,
      },
    ]);
    expect(carrinho.valorTotal).toBe(vaso.preco);
  });

  test("adicionar a mesma peça de novo soma a quantidade, sem duplicar a linha", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    const carrinho = await concluir(carrinhoService.adicionar(vaso, 2));

    expect(carrinho.itens).toHaveLength(1);
    expect(carrinho.itens[0].quantidade).toBe(3);
    expect(carrinho.valorTotal).toBe(vaso.preco * 3);
  });

  test("valorTotal soma preço vezes quantidade de cada item", async () => {
    await concluir(carrinhoService.adicionar(vaso, 2));
    const carrinho = await concluir(carrinhoService.adicionar(luminaria, 1));

    expect(carrinho.valorTotal).toBe(vaso.preco * 2 + luminaria.preco);
  });

  test("o carrinho fica gravado no localStorage e sobrevive a um novo obter()", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));

    expect(lerGravado<ItemCarrinho[]>("carrinho")).toHaveLength(1);
    expect((await carrinhoService.obter()).itens[0].produtoId).toBe(vaso.id);
  });

  test("alterarQuantidade troca só a quantidade do item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 2));
    const carrinho = await concluir(carrinhoService.alterarQuantidade(vaso.id, 4));

    expect(carrinho.itens.map((item) => [item.produtoId, item.quantidade])).toEqual([
      [vaso.id, 4],
      [luminaria.id, 2],
    ]);
    expect(carrinho.valorTotal).toBe(vaso.preco * 4 + luminaria.preco * 2);
  });

  test("alterarQuantidade para zero tira só o item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 2));
    const carrinho = await concluir(carrinhoService.alterarQuantidade(vaso.id, 0));

    expect(carrinho.itens.map((item) => [item.produtoId, item.quantidade])).toEqual([[luminaria.id, 2]]);
    expect(carrinho.valorTotal).toBe(luminaria.preco * 2);
  });

  test("remover tira só o item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 1));
    const carrinho = await concluir(carrinhoService.remover(vaso.id));

    expect(carrinho.itens.map((item) => item.produtoId)).toEqual([luminaria.id]);
    expect(carrinho.valorTotal).toBe(luminaria.preco);
  });

  test("esvaziar zera o carrinho gravado", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await carrinhoService.esvaziar();

    expect(lerGravado<ItemCarrinho[]>("carrinho")).toEqual([]);
    expect((await carrinhoService.obter()).valorTotal).toBe(0);
  });
});
