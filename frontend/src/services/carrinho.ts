import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { http } from "@/lib/http";
import { authService } from "@/services/auth";
import type { Carrinho, ItemCarrinho, ProdutoResumo } from "@/types";

const CARRINHO_VAZIO: Carrinho = { itens: [], valorTotal: 0 };
const CHAVE_CARRINHO = "carrinho";

function sessaoAtual() {
  return authService.sessaoAtual();
}

function ehCompradorAutenticado(): boolean {
  const sessao = sessaoAtual();
  return Boolean(sessao?.token && sessao.usuario.papel === "COMPRADOR");
}

function ehVisitante(): boolean {
  return !sessaoAtual()?.token;
}

function exigirCompradorAutenticado(): void {
  if (!ehCompradorAutenticado()) {
    throw new Error("AUTENTICACAO_NECESSARIA");
  }
}

function sincronizarLocal(carrinho: Carrinho): Carrinho {
  gravarLocal(CHAVE_CARRINHO, carrinho?.itens ?? []);
  return carrinho;
}

function obterLocal(): Carrinho {
  const itens = lerLocal<ItemCarrinho[]>(CHAVE_CARRINHO);
  const itensValidos = Array.isArray(itens)
    ? itens.filter(
        (item) =>
          item &&
          typeof item.produtoId === "string" &&
          Number.isInteger(item.quantidade) &&
          item.quantidade > 0 &&
          Number.isFinite(item.precoUnitario),
      )
    : [];
  return {
    itens: itensValidos,
    valorTotal: itensValidos.reduce(
      (total, item) => total + item.precoUnitario * item.quantidade,
      0,
    ),
  };
}

function gravarCarrinhoLocal(itens: ItemCarrinho[]): Carrinho {
  const carrinho = {
    itens,
    valorTotal: itens.reduce(
      (total, item) => total + item.precoUnitario * item.quantidade,
      0,
    ),
  };
  gravarLocal(CHAVE_CARRINHO, carrinho.itens);
  return carrinho;
}

function validarQuantidadeLocal(quantidade: number): void {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error("A quantidade deve ser um número inteiro maior que zero.");
  }
}

export const carrinhoService = {
  async obter(): Promise<Carrinho> {
    if (ehVisitante()) {
      return obterLocal();
    }
    exigirCompradorAutenticado();
    const res = await http<Carrinho>("/carrinho");
    return sincronizarLocal(res);
  },

  async adicionar(produto: ProdutoResumo, quantidade = 1): Promise<Carrinho> {
    exigirCompradorAutenticado();

    await http("/carrinho/itens", {
      metodo: "POST",
      corpo: { produtoId: produto.id, quantidade },
    });
    return this.obter();
  },

  async adicionarVisitante(
    produto: ProdutoResumo,
    quantidade = 1,
  ): Promise<Carrinho> {
    if (!ehVisitante()) exigirCompradorAutenticado();
    validarQuantidadeLocal(quantidade);
    if (produto.disponibilidade !== "DISPONIVEL") {
      throw new Error("Esta peça não está disponível para o carrinho.");
    }

    const estoque = (produto as ProdutoResumo & { estoque?: number }).estoque;
    const carrinho = obterLocal();
    const existente = carrinho.itens.find((item) => item.produtoId === produto.id);
    const novaQuantidade = (existente?.quantidade ?? 0) + quantidade;
    if (typeof estoque === "number" && novaQuantidade > estoque) {
      throw new Error("A quantidade solicitada excede o estoque disponível.");
    }
    if (produto.modalidadeProducao === "PECA_UNICA" && novaQuantidade > 1) {
      throw new Error("Uma peça única permite somente uma unidade no carrinho.");
    }

    const item: ItemCarrinho = {
      produtoId: produto.id,
      quantidade: novaQuantidade,
      precoUnitario: produto.preco,
      nome: produto.nome,
      imagemPrincipal: produto.imagemPrincipal,
    };
    const itens = existente
      ? carrinho.itens.map((atual) =>
          atual.produtoId === produto.id ? item : atual,
        )
      : [...carrinho.itens, item];
    return gravarCarrinhoLocal(itens);
  },

  async alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): Promise<Carrinho> {
    if (!Number.isInteger(quantidade)) {
      throw new Error("A quantidade deve ser um número inteiro.");
    }
    if (ehVisitante()) {
      if (quantidade <= 0) return this.remover(produtoId);
      const carrinho = obterLocal();
      const itens = carrinho.itens.map((item) =>
        item.produtoId === produtoId ? { ...item, quantidade } : item,
      );
      return gravarCarrinhoLocal(itens);
    }
    exigirCompradorAutenticado();
    if (quantidade <= 0) {
      return this.remover(produtoId);
    }

    await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
      metodo: "PUT",
      corpo: { quantidade },
    });
    return this.obter();
  },

  async remover(produtoId: string): Promise<Carrinho> {
    if (ehVisitante()) {
      return gravarCarrinhoLocal(
        obterLocal().itens.filter((item) => item.produtoId !== produtoId),
      );
    }
    exigirCompradorAutenticado();

    await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
      metodo: "DELETE",
    });
    return this.obter();
  },

  async esvaziar(): Promise<Carrinho> {
    if (ehVisitante()) {
      gravarLocal(CHAVE_CARRINHO, []);
      return CARRINHO_VAZIO;
    }
    exigirCompradorAutenticado();

    const { itens } = await this.obter();
    for (const item of itens) {
      await http(`/carrinho/itens/${encodeURIComponent(item.produtoId)}`, {
        metodo: "DELETE",
      });
    }
    gravarLocal(CHAVE_CARRINHO, []);
    return this.obter();
  },
};
