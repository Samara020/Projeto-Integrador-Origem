type NoFila<T> = {
  item: T;
  proximo: NoFila<T> | null;
};

/**
 * Fila FIFO generica com nos encadeados.
 * Enfileirar e desenfileirar em O(1).
 */
export class Fila<T> {
  private frente: NoFila<T> | null = null;
  private tras: NoFila<T> | null = null;
  private _tamanho = 0;

  enfileirar(item: T): void {
    const novo: NoFila<T> = { item, proximo: null };
    if (this.tras) {
      this.tras.proximo = novo;
    } else {
      this.frente = novo;
    }
    this.tras = novo;
    this._tamanho++;
  }

  desenfileirar(): T | null {
    if (!this.frente) return null;
    const item = this.frente.item;
    this.frente = this.frente.proximo;
    if (!this.frente) {
      this.tras = null;
    }
    this._tamanho--;
    return item;
  }

  espiar(): T | null {
    return this.frente ? this.frente.item : null;
  }

  estaVazia(): boolean {
    return this._tamanho === 0;
  }

  tamanho(): number {
    return this._tamanho;
  }

  paraArray(): T[] {
    const resultado: T[] = [];
    let atual = this.frente;
    while (atual) {
      resultado.push(atual.item);
      atual = atual.proximo;
    }
    return resultado;
  }
}
