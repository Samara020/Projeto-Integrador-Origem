// Lista de peças para comparar (HU-25), guardada no navegador. Até 3 peças.
// Os dados de cada peça vêm de GET /produtos/{id}; o backend real terá GET /produtos/comparar?ids=.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";

const CHAVE = "comparacao";
export const MAXIMO_COMPARACAO = 3;

export const comparacaoService = {
  listar(): string[] {
    return lerLocal<string[]>(CHAVE) ?? [];
  },
  alternar(produtoId: string): string[] {
    const atual = this.listar();
    const nova = atual.includes(produtoId)
      ? atual.filter((id) => id !== produtoId)
      : [...atual, produtoId].slice(-MAXIMO_COMPARACAO);
    gravarLocal(CHAVE, nova);
    return nova;
  },
  remover(produtoId: string): string[] {
    const nova = this.listar().filter((id) => id !== produtoId);
    gravarLocal(CHAVE, nova);
    return nova;
  },
  limpar(): void {
    gravarLocal(CHAVE, []);
  },
};
