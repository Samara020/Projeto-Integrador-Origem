import { http } from "@/lib/http";
import { authService } from "@/services/auth";
import type { Carrinho, ProdutoResumo } from "@/types";

const CARRINHO_VAZIO: Carrinho = { itens: [], valorTotal: 0 };

function ehCompradorAutenticado(): boolean {
  const sessao = authService.sessaoAtual();
  return Boolean(
    sessao?.token &&
      sessao.usuario.papel === "COMPRADOR",
  );
}

function exigirCompradorAutenticado(): void {
  if (!ehCompradorAutenticado()) {
    throw new Error("AUTENTICACAO_NECESSARIA");
  }
}

export const carrinhoService = {
  async obter(): Promise<Carrinho> {
    if (!ehCompradorAutenticado()) {
      return CARRINHO_VAZIO;
    }
    return http<Carrinho>("/carrinho");
  },

  async adicionar(produto: ProdutoResumo, quantidade = 1): Promise<Carrinho> {
    exigirCompradorAutenticado();

    await http("/carrinho/itens", {
      metodo: "POST",
      corpo: { produtoId: produto.id, quantidade },
    });
    return this.obter();
  },

  async alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): Promise<Carrinho> {
    exigirCompradorAutenticado();

    if (!Number.isInteger(quantidade)) {
      throw new Error("A quantidade deve ser um número inteiro.");
    }
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
    exigirCompradorAutenticado();

    await http(`/carrinho/itens/${encodeURIComponent(produtoId)}`, {
      metodo: "DELETE",
    });
    return this.obter();
  },

  async esvaziar(): Promise<Carrinho> {
    exigirCompradorAutenticado();

    const { itens } = await this.obter();
    for (const item of itens) {
      await http(`/carrinho/itens/${encodeURIComponent(item.produtoId)}`, {
        metodo: "DELETE",
      });
    }
    return this.obter();
  },
};
