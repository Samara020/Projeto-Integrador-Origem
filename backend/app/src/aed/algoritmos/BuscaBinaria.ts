export type ResultadoBusca = {
  index: number;
  encontrado: boolean;
  comparacoes: number;
};

export function buscaBinaria<T>(
  arrayOrdenado: T[],
  chave: any,
  comparador: (item: T, chave: any) => number
): ResultadoBusca {
  let esquerda = 0;
  let direita = arrayOrdenado.length - 1;
  let comparacoes = 0;
  while (esquerda <= direita) {
    const meio = Math.floor((esquerda + direita) / 2);
    const cmp = comparador(arrayOrdenado[meio], chave);
    comparacoes++;
    if (cmp === 0) {
      return { index: meio, encontrado: true, comparacoes };
    }
    if (cmp < 0) {
      esquerda = meio + 1;
    } else {
      direita = meio - 1;
    }
  }
  return { index: -1, encontrado: false, comparacoes };
}

export function buscaBinariaRecursiva<T>(
  arrayOrdenado: T[],
  chave: any,
  comparador: (item: T, chave: any) => number
): ResultadoBusca {
  return buscaRecursiva(arrayOrdenado, chave, comparador, 0, arrayOrdenado.length - 1, 0);
}

function buscaRecursiva<T>(
  arrayOrdenado: T[],
  chave: any,
  comparador: (item: T, chave: any) => number,
  esquerda: number,
  direita: number,
  comparacoes: number
): ResultadoBusca {
  if (esquerda > direita) {
    return { index: -1, encontrado: false, comparacoes };
  }
  const meio = Math.floor((esquerda + direita) / 2);
  const cmp = comparador(arrayOrdenado[meio], chave);
  comparacoes++;
  if (cmp === 0) {
    return { index: meio, encontrado: true, comparacoes };
  }
  if (cmp < 0) {
    return buscaRecursiva(arrayOrdenado, chave, comparador, meio + 1, direita, comparacoes);
  }
  return buscaRecursiva(arrayOrdenado, chave, comparador, esquerda, meio - 1, comparacoes);
}
