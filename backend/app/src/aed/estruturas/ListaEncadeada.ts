type No<T> = {
  dado: T;
  proximo: No<T> | null;
  anterior: No<T> | null;
};

/**
 * Lista duplamente encadeada genérica.
 * Insercao/remocao nas extremidades em O(1) e acesso por indice em O(n).
 */
export class ListaEncadeada<T> {
  private cabeca: No<T> | null = null;
  private cauda: No<T> | null = null;
  private _tamanho = 0;

  adicionarNoInicio(dado: T): void {
    const novo: No<T> = { dado, proximo: this.cabeca, anterior: null };
    if (this.cabeca) {
      this.cabeca.anterior = novo;
    } else {
      this.cauda = novo;
    }
    this.cabeca = novo;
    this._tamanho++;
  }

  adicionarNoFim(dado: T): void {
    const novo: No<T> = { dado, proximo: null, anterior: this.cauda };
    if (this.cauda) {
      this.cauda.proximo = novo;
    } else {
      this.cabeca = novo;
    }
    this.cauda = novo;
    this._tamanho++;
  }

  /**
   * Insere mantendo a lista ordenada de acordo com o comparador.
   * comparador(a, b) < 0 => a vem antes de b.
   */
  inserirOrdenado(dado: T, comparador: (a: T, b: T) => number): void {
    const novo: No<T> = { dado, proximo: null, anterior: null };

    if (!this.cabeca) {
      this.cabeca = novo;
      this.cauda = novo;
      this._tamanho++;
      return;
    }

    if (comparador(dado, this.cabeca.dado) <= 0) {
      this.adicionarNoInicio(dado);
      return;
    }

    if (comparador(dado, this.cauda!.dado) >= 0) {
      this.adicionarNoFim(dado);
      return;
    }

    let atual = this.cabeca.proximo;
    while (atual) {
      if (comparador(dado, atual.dado) <= 0) {
        const anterior = atual.anterior!;
        novo.proximo = atual;
        novo.anterior = anterior;
        anterior.proximo = novo;
        atual.anterior = novo;
        this._tamanho++;
        return;
      }
      atual = atual.proximo;
    }

    this.adicionarNoFim(dado);
  }

  /**
   * Remove o primeiro elemento que satisfaz o criterio e retorna seu dado.
   */
  removerPorId(criterio: (dado: T) => boolean): T | null {
    let atual = this.cabeca;
    while (atual) {
      if (criterio(atual.dado)) {
        const dado = atual.dado;
        this.removerNo(atual);
        return dado;
      }
      atual = atual.proximo;
    }
    return null;
  }

  removerDoInicio(): T | null {
    if (!this.cabeca) return null;
    const dado = this.cabeca.dado;
    this.removerNo(this.cabeca);
    return dado;
  }

  removerDoFim(): T | null {
    if (!this.cauda) return null;
    const dado = this.cauda.dado;
    this.removerNo(this.cauda);
    return dado;
  }

  obter(indice: number): T | null {
    if (indice < 0 || indice >= this._tamanho) return null;
    let atual: No<T> | null;
    let i: number;
    if (indice < this._tamanho / 2) {
      atual = this.cabeca;
      i = 0;
      while (atual && i < indice) {
        atual = atual.proximo;
        i++;
      }
    } else {
      atual = this.cauda;
      i = this._tamanho - 1;
      while (atual && i > indice) {
        atual = atual.anterior;
        i--;
      }
    }
    return atual ? atual.dado : null;
  }

  paraArray(): T[] {
    const resultado: T[] = [];
    let atual = this.cabeca;
    while (atual) {
      resultado.push(atual.dado);
      atual = atual.proximo;
    }
    return resultado;
  }

  limpar(): void {
    this.cabeca = null;
    this.cauda = null;
    this._tamanho = 0;
  }

  tamanho(): number {
    return this._tamanho;
  }

  private removerNo(no: No<T>): void {
    if (no.anterior) {
      no.anterior.proximo = no.proximo;
    } else {
      this.cabeca = no.proximo;
    }
    if (no.proximo) {
      no.proximo.anterior = no.anterior;
    } else {
      this.cauda = no.anterior;
    }
    no.proximo = null;
    no.anterior = null;
    this._tamanho--;
  }
}
