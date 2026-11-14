type NoPilha<T> = {
  item: T;
  proximo: NoPilha<T> | null;
};

/**
 * Pilha LIFO generica com nos encadeados.
 * Empilhar e desempilhar em O(1).
 */
export class Pilha<T> {
  private topoNo: NoPilha<T> | null = null;
  private _tamanho = 0;

  empilhar(item: T): void {
    this.topoNo = { item, proximo: this.topoNo };
    this._tamanho++;
  }

  desempilhar(): T | null {
    if (!this.topoNo) return null;
    const item = this.topoNo.item;
    this.topoNo = this.topoNo.proximo;
    this._tamanho--;
    return item;
  }

  topo(): T | null {
    return this.topoNo ? this.topoNo.item : null;
  }

  estaVazia(): boolean {
    return this._tamanho === 0;
  }

  tamanho(): number {
    return this._tamanho;
  }

  paraArray(): T[] {
    const resultado: T[] = [];
    let atual = this.topoNo;
    while (atual) {
      resultado.push(atual.item);
      atual = atual.proximo;
    }
    return resultado;
  }
}
