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
      sessao.usuario.papel === "COMPRADOR" &&
      process.env.NEXT_PUBLIC_API_URL,
  );
}

export const carrinhoService = {
  // GET /carrinho
  async obter(): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      try {
        return await http<Carrinho>("/carrinho");
      } catch {
        return montar(ler());
      }
    }
    return montar(ler());
  },

  // POST /carrinho/itens
  async adicionar(produto: ProdutoResumo, quantidade = 1): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      try {
        await http<{ mensagem: string }>("/carrinho/itens", {
          metodo: "POST",
          corpo: { produtoId: produto.id, quantidade },
        });
        return await this.obter();
      } catch {
        // Fallback para modo local se o backend falhar
      }
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

  async alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): Promise<Carrinho> {
    if (ehCompradorAutenticado()) {
      if (quantidade > 0) {
        await http<{ mensagem: string }>("/carrinho/itens", {
          metodo: "POST",
          corpo: { produtoId, quantidade },
        });
      } else {
        await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
          metodo: "DELETE",
        });
      }
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
    const itens = ler();
    if (ehCompradorAutenticado()) {
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
