type EntradaHash<K, V> = {
  chave: K;
  valor: V;
};

export class TabelaHash<K, V> {
  private buckets: EntradaHash<K, V>[][] = [];
  private _tamanho = 0;
  private readonly fatorCargaMaximo = 0.75;

  constructor(capacidadeInicial: number = 8) {
    this.inicializarBuckets(Math.max(1, capacidadeInicial));
  }

  private inicializarBuckets(capacidade: number): void {
    this.buckets = Array.from({ length: capacidade }, () => []);
  }

  private dispersao(chave: K): number {
    const texto = String(chave);
    let hash = 5381;
    for (let i = 0; i < texto.length; i++) {
      hash = ((hash << 5) + hash) + texto.charCodeAt(i);
      hash = hash >>> 0;
    }
    return hash % this.buckets.length;
  }

  inserir(chave: K, valor: V): void {
    const indice = this.dispersao(chave);
    const bucket = this.buckets[indice];
    for (const entrada of bucket) {
      if (entrada.chave === chave) {
        entrada.valor = valor;
        return;
      }
    }
    bucket.push({ chave, valor });
    this._tamanho++;
    if (this.fatorDeCarga() > this.fatorCargaMaximo) {
      this.redimensionar();
    }
  }

  buscar(chave: K): V | null {
    const indice = this.dispersao(chave);
    const bucket = this.buckets[indice];
    for (const entrada of bucket) {
      if (entrada.chave === chave) {
        return entrada.valor;
      }
    }
    return null;
  }

  contem(chave: K): boolean {
    return this.buscar(chave) !== null;
  }

  remover(chave: K): boolean {
    const indice = this.dispersao(chave);
    const bucket = this.buckets[indice];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i].chave === chave) {
        bucket.splice(i, 1);
        this._tamanho--;
        return true;
      }
    }
    return false;
  }

  chaves(): K[] {
    const resultado: K[] = [];
    for (const bucket of this.buckets) {
      for (const entrada of bucket) {
        resultado.push(entrada.chave);
      }
    }
    return resultado;
  }

  valores(): V[] {
    const resultado: V[] = [];
    for (const bucket of this.buckets) {
      for (const entrada of bucket) {
        resultado.push(entrada.valor);
      }
    }
    return resultado;
  }

  tamanho(): number {
    return this._tamanho;
  }

  fatorDeCarga(): number {
    return this._tamanho / this.buckets.length;
  }

  private redimensionar(): void {
    const antiga = this.buckets;
    this.inicializarBuckets(antiga.length * 2);
    this._tamanho = 0;
    for (const bucket of antiga) {
      for (const entrada of bucket) {
        this.inserir(entrada.chave, entrada.valor);
      }
    }
  }
}
