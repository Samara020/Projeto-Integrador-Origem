import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { http } from "@/lib/http";
import { authService } from "@/services/auth";
import type { Carrinho, ItemCarrinho, ProdutoResumo } from "@/types";

const CHAVE = "carrinho";

function ler(): ItemCarrinho[] {
  return lerLocal<ItemCarrinho[]>(CHAVE) ?? [];
}

function montar(itens: ItemCarrinho[]): Carrinho {
  const valorTotal = itens.reduce(
    (total, item) => total + item.precoUnitario * item.quantidade,
    0,
  );
  return { itens, valorTotal };
}

function salvar(itens: ItemCarrinho[]): Carrinho {
  gravarLocal(CHAVE, itens);
  return montar(itens);
}

function ehCompradorAutenticado(): boolean {
  const sessao = authService.sessaoAtual();
  return Boolean(
    sessao?.token &&
      sessao.usuario.papel === "COMPRADOR",
  );
}

export const carrinhoService = {
  // GET /carrinho
  async obter(): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      return http<Carrinho>("/carrinho");
    }
    return montar(ler());
  },

  // POST /carrinho/itens
  async adicionar(produto: ProdutoResumo, quantidade = 1): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      await http("/carrinho/itens", {
        metodo: "POST", corpo: { produtoId: produto.id, quantidade },
      });
      return this.obter();
    }

    const itens = ler();
    const existente = itens.find((item) => item.produtoId === produto.id);

    if (existente) {
      existente.quantidade += quantidade;
    } else {
      itens.push({
        produtoId: produto.id,
        quantidade,
        precoUnitario: produto.preco,
        nome: produto.nome,
        imagemPrincipal: produto.imagemPrincipal,
      });
    }
    return salvar(itens);
  },

  // PUT /carrinho/itens/{produtoId} (>= 1) ou DELETE /carrinho/itens/{produtoId} (<= 0)
  async alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      if (quantidade <= 0) {
        return this.remover(produtoId);
      }
      await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
        metodo: "PUT",
        corpo: { quantidade },
      });
      return this.obter();
    }

    return salvar(
      ler()
        .map((item) =>
          item.produtoId === produtoId ? { ...item, quantidade } : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  },

  // DELETE /carrinho/itens/{produtoId}
  async remover(produtoId: string): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
        metodo: "DELETE",
      });
      return this.obter();
    }

    return salvar(ler().filter((item) => item.produtoId !== produtoId));
  },

  async esvaziar(): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      const { itens } = await this.obter();
      for (const item of itens) {
        await http(`/carrinho/itens/${encodeURIComponent(item.produtoId)}`, {
          metodo: "DELETE",
        });
      }
      return this.obter();
    }
    return salvar([]);
  },
};
