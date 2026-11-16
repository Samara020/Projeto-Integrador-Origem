type NoBST<T> = {
  dado: T;
  esquerda: NoBST<T> | null;
  direita: NoBST<T> | null;
};

export class ArvoreBinariaBusca<T> {
  private raiz: NoBST<T> | null = null;
  private _tamanho = 0;
  private readonly comparador: (a: T, b: T) => number;

  constructor(comparador?: (a: T, b: T) => number) {
    this.comparador =
      comparador ||
      ((a: T, b: T) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
  }

  inserir(dado: T): void {
    if (!this.raiz) {
      this.raiz = { dado, esquerda: null, direita: null };
      this._tamanho++;
      return;
    }
    let atual: NoBST<T> | null = this.raiz;
    let pai: NoBST<T> | null = null;
    while (atual) {
      pai = atual;
      if (this.comparador(dado, atual.dado) <= 0) {
        atual = atual.esquerda;
      } else {
        atual = atual.direita;
      }
    }
    const novo: NoBST<T> = { dado, esquerda: null, direita: null };
    if (this.comparador(dado, pai!.dado) <= 0) {
      pai!.esquerda = novo;
    } else {
      pai!.direita = novo;
    }
    this._tamanho++;
  }

  buscar(
    criterio: any,
    comparadorChave?: (dado: T, criterio: any) => number
  ): T | null {
    const comparar = comparadorChave || ((dado: T) => this.comparador(dado, criterio as T));
    let atual: NoBST<T> | null = this.raiz;
    while (atual) {
      const cmp = comparar(atual.dado, criterio);
      if (cmp === 0) {
        return atual.dado;
      }
      if (cmp < 0) {
        atual = atual.direita;
      } else {
        atual = atual.esquerda;
      }
    }
    return null;
  }

  remover(dado: T): boolean {
    let pai: NoBST<T> | null = null;
    let atual: NoBST<T> | null = this.raiz;
    while (atual && this.comparador(atual.dado, dado) !== 0) {
      pai = atual;
      if (this.comparador(dado, atual.dado) <= 0) {
        atual = atual.esquerda;
      } else {
        atual = atual.direita;
      }
    }
    if (!atual) {
      return false;
    }

    if (atual.esquerda && atual.direita) {
      let paiSucessor = atual;
      let sucessor = atual.direita;
      while (sucessor.esquerda) {
        paiSucessor = sucessor;
        sucessor = sucessor.esquerda;
      }
      atual.dado = sucessor.dado;
      if (paiSucessor === atual) {
        paiSucessor.direita = sucessor.direita;
      } else {
        paiSucessor.esquerda = sucessor.direita;
      }
    } else {
      const filho = atual.esquerda ?? atual.direita;
      if (!pai) {
        this.raiz = filho;
      } else if (pai.esquerda === atual) {
        pai.esquerda = filho;
      } else {
        pai.direita = filho;
      }
    }
    this._tamanho--;
    return true;
  }

  emOrdem(): T[] {
    const resultado: T[] = [];
    this.emOrdemNo(this.raiz, resultado);
    return resultado;
  }

  preOrdem(): T[] {
    const resultado: T[] = [];
    this.preOrdemNo(this.raiz, resultado);
    return resultado;
  }

  posOrdem(): T[] {
    const resultado: T[] = [];
    this.posOrdemNo(this.raiz, resultado);
    return resultado;
  }

  minimo(): T | null {
    let atual = this.raiz;
    while (atual && atual.esquerda) {
      atual = atual.esquerda;
    }
    return atual ? atual.dado : null;
  }

  maximo(): T | null {
    let atual = this.raiz;
    while (atual && atual.direita) {
      atual = atual.direita;
    }
    return atual ? atual.dado : null;
  }

  altura(): number {
    return this.alturaNo(this.raiz);
  }

  tamanho(): number {
    return this._tamanho;
  }

  estaVazia(): boolean {
    return this._tamanho === 0;
  }

  private emOrdemNo(no: NoBST<T> | null, resultado: T[]): void {
    if (!no) return;
    this.emOrdemNo(no.esquerda, resultado);
    resultado.push(no.dado);
    this.emOrdemNo(no.direita, resultado);
  }

  private preOrdemNo(no: NoBST<T> | null, resultado: T[]): void {
    if (!no) return;
    resultado.push(no.dado);
    this.preOrdemNo(no.esquerda, resultado);
    this.preOrdemNo(no.direita, resultado);
  }

  private posOrdemNo(no: NoBST<T> | null, resultado: T[]): void {
    if (!no) return;
    this.posOrdemNo(no.esquerda, resultado);
    this.posOrdemNo(no.direita, resultado);
    resultado.push(no.dado);
  }

  private alturaNo(no: NoBST<T> | null): number {
    if (!no) return 0;
    return 1 + Math.max(this.alturaNo(no.esquerda), this.alturaNo(no.direita));
  }
}
