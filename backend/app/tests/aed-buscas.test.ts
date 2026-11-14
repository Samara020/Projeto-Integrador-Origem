import { TabelaHash } from "../src/aed/estruturas/TabelaHash";
import { ArvoreBinariaBusca } from "../src/aed/estruturas/ArvoreBinariaBusca";
import { buscaBinaria, buscaBinariaRecursiva } from "../src/aed/algoritmos/BuscaBinaria";

describe("TabelaHash (encadeamento separado, rehash)", () => {
  test("inserir e buscar valores por chave", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("P001", 10);
    tabela.inserir("P002", 20);
    expect(tabela.buscar("P001")).toBe(10);
    expect(tabela.buscar("P002")).toBe(20);
    expect(tabela.tamanho()).toBe(2);
  });

  test("inserir chave existente atualiza o valor sem aumentar o tamanho", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("P001", 10);
    tabela.inserir("P001", 99);
    expect(tabela.buscar("P001")).toBe(99);
    expect(tabela.tamanho()).toBe(1);
  });

  test("contem retorna true para chaves existentes e false para inexistentes", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("A", 1);
    expect(tabela.contem("A")).toBe(true);
    expect(tabela.contem("B")).toBe(false);
  });

  test("busca de chave inexistente retorna null", () => {
    const tabela = new TabelaHash<string, number>();
    expect(tabela.buscar("NAO_EXISTE")).toBeNull();
  });

  test("remover remove chave existente e retorna true", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("A", 1);
    tabela.inserir("B", 2);
    expect(tabela.remover("A")).toBe(true);
    expect(tabela.buscar("A")).toBeNull();
    expect(tabela.tamanho()).toBe(1);
    expect(tabela.contem("B")).toBe(true);
  });

  test("remover chave inexistente retorna false", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("A", 1);
    expect(tabela.remover("Z")).toBe(false);
    expect(tabela.tamanho()).toBe(1);
  });

  test("chaves e valores retornam todos os itens inseridos", () => {
    const tabela = new TabelaHash<string, number>();
    tabela.inserir("X", 1);
    tabela.inserir("Y", 2);
    tabela.inserir("Z", 3);
    expect(tabela.chaves().sort()).toEqual(["X", "Y", "Z"]);
    expect(tabela.valores().sort()).toEqual([1, 2, 3]);
  });

  test("fator de carga e tamanho refletem o preenchimento", () => {
    const tabela = new TabelaHash<string, number>(4);
    tabela.inserir("a", 1);
    tabela.inserir("b", 2);
    expect(tabela.fatorDeCarga()).toBe(2 / 4);
    expect(tabela.tamanho()).toBe(2);
  });

  test("forca colisoes com muitas chaves e todas permanecem recuperaveis", () => {
    const tabela = new TabelaHash<string, number>(4);
    const total = 50;
    for (let i = 0; i < total; i++) {
      tabela.inserir(`chave-${i}`, i);
    }
    expect(tabela.tamanho()).toBe(total);
    for (let i = 0; i < total; i++) {
      expect(tabela.buscar(`chave-${i}`)).toBe(i);
    }
  });

  test("rehash automatico quando fator de carga ultrapassa 0.75", () => {
    const tabela = new TabelaHash<string, number>(4);
    for (let i = 0; i < 10; i++) {
      tabela.inserir(`k${i}`, i);
    }
    expect(tabela.tamanho()).toBe(10);
    expect(tabela.fatorDeCarga()).toBeLessThanOrEqual(0.75);
    for (let i = 0; i < 10; i++) {
      expect(tabela.buscar(`k${i}`)).toBe(i);
    }
  });

  test("rehash preserve dados apos remocoes e reinsercoes", () => {
    const tabela = new TabelaHash<string, number>(4);
    for (let i = 0; i < 12; i++) tabela.inserir(`k${i}`, i);
    tabela.remover("k0");
    tabela.remover("k1");
    tabela.inserir("k100", 100);
    expect(tabela.buscar("k100")).toBe(100);
    expect(tabela.buscar("k0")).toBeNull();
    expect(tabela.tamanho()).toBe(11);
  });

  test("tabela com chaves numericas", () => {
    const tabela = new TabelaHash<number, string>();
    tabela.inserir(101, "produto A");
    tabela.inserir(202, "produto B");
    expect(tabela.buscar(101)).toBe("produto A");
    expect(tabela.buscar(999)).toBeNull();
    expect(tabela.tamanho()).toBe(2);
  });
});

describe("ArvoreBinariaBusca (BST)", () => {
  const numeros = [50, 30, 70, 20, 40, 60, 80, 10, 25];

  test("insercao desordenada e percurso em-ordem estritamente ordenado", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    const ordenado = arvore.emOrdem();
    expect(ordenado).toEqual([10, 20, 25, 30, 40, 50, 60, 70, 80]);
    for (let i = 1; i < ordenado.length; i++) {
      expect(ordenado[i]).toBeGreaterThan(ordenado[i - 1]);
    }
    expect(arvore.tamanho()).toBe(numeros.length);
    expect(arvore.estaVazia()).toBe(false);
  });

  test("arvore vazia estaVazia true e tamanho zero", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    expect(arvore.estaVazia()).toBe(true);
    expect(arvore.tamanho()).toBe(0);
    expect(arvore.emOrdem()).toEqual([]);
  });

  test("busca de elementos existentes e inexistentes", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    expect(arvore.buscar(50)).toBe(50);
    expect(arvore.buscar(10)).toBe(10);
    expect(arvore.buscar(80)).toBe(80);
    expect(arvore.buscar(100)).toBeNull();
    expect(arvore.buscar(-5)).toBeNull();
  });

  test("busca com criterio e comparadorChave personalizado em objetos", () => {
    type Produto = { id: number; nome: string };
    const arvore = new ArvoreBinariaBusca<Produto>(
      (a, b) => a.id - b.id
    );
    arvore.inserir({ id: 5, nome: "cinco" });
    arvore.inserir({ id: 2, nome: "dois" });
    arvore.inserir({ id: 8, nome: "oito" });
    const achado = arvore.buscar(8, (dado, criterio) => dado.id - Number(criterio));
    expect(achado).toEqual({ id: 8, nome: "oito" });
    expect(arvore.buscar(99, (dado, criterio) => dado.id - Number(criterio))).toBeNull();
  });

  test("minimo e maximo", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    expect(arvore.minimo()).toBe(10);
    expect(arvore.maximo()).toBe(80);
  });

  test("minimo e maximo em arvore vazia retornam null", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    expect(arvore.minimo()).toBeNull();
    expect(arvore.maximo()).toBeNull();
  });

  test("percurso pre-ordem e pos-ordem", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    expect(arvore.preOrdem()[0]).toBe(50);
    expect(arvore.posOrdem()[arvore.posOrdem().length - 1]).toBe(50);
    expect(arvore.preOrdem().length).toBe(arvore.tamanho());
    expect(arvore.posOrdem().length).toBe(arvore.tamanho());
  });

  test("altura da arvore", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    expect(arvore.altura()).toBe(0);
    arvore.inserir(10);
    expect(arvore.altura()).toBe(1);
    arvore.inserir(5);
    arvore.inserir(15);
    expect(arvore.altura()).toBe(2);
  });

  test("remocao de no sem filhos (folha)", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    expect(arvore.remover(10)).toBe(true);
    expect(arvore.tamanho()).toBe(numeros.length - 1);
    expect(arvore.buscar(10)).toBeNull();
    expect(arvore.emOrdem()).toEqual([20, 25, 30, 40, 50, 60, 70, 80]);
  });

  test("remocao de no com um filho", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    arvore.inserir(10);
    arvore.inserir(5);
    arvore.inserir(30);
    arvore.inserir(20);
    expect(arvore.remover(30)).toBe(true);
    expect(arvore.buscar(30)).toBeNull();
    expect(arvore.emOrdem()).toEqual([5, 10, 20]);
  });

  test("remocao de no com dois filhos", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    for (const n of numeros) arvore.inserir(n);
    expect(arvore.remover(50)).toBe(true);
    expect(arvore.buscar(50)).toBeNull();
    expect(arvore.tamanho()).toBe(numeros.length - 1);
    const emOrdem = arvore.emOrdem();
    expect(emOrdem).toEqual([10, 20, 25, 30, 40, 60, 70, 80]);
    for (let i = 1; i < emOrdem.length; i++) {
      expect(emOrdem[i]).toBeGreaterThan(emOrdem[i - 1]);
    }
  });

  test("remocao de raiz em arvore com um no", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    arvore.inserir(42);
    expect(arvore.remover(42)).toBe(true);
    expect(arvore.estaVazia()).toBe(true);
    expect(arvore.tamanho()).toBe(0);
  });

  test("remocao de chave inexistente retorna false", () => {
    const arvore = new ArvoreBinariaBusca<number>();
    arvore.inserir(10);
    expect(arvore.remover(99)).toBe(false);
    expect(arvore.tamanho()).toBe(1);
  });
});

describe("Busca Binaria (iterativa e recursiva)", () => {
  const comparadorNumeros = (item: number, chave: any) => item - Number(chave);

  test("array com numero impar de elementos encontra no meio", () => {
    const arr = [1, 3, 5, 7, 9, 11, 13];
    const r = buscaBinaria(arr, 7, comparadorNumeros);
    expect(r.encontrado).toBe(true);
    expect(r.index).toBe(3);
    expect(r.comparacoes).toBeGreaterThan(0);
  });

  test("array com numero par de elementos", () => {
    const arr = [2, 4, 6, 8, 10, 12];
    const r1 = buscaBinaria(arr, 8, comparadorNumeros);
    expect(r1.encontrado).toBe(true);
    const r2 = buscaBinaria(arr, 2, comparadorNumeros);
    expect(r2.encontrado).toBe(true);
    expect(r2.index).toBe(0);
  });

  test("primeiro e ultimo elementos", () => {
    const arr = [5, 10, 15, 20, 25];
    expect(buscaBinaria(arr, 5, comparadorNumeros).encontrado).toBe(true);
    expect(buscaBinaria(arr, 25, comparadorNumeros).encontrado).toBe(true);
    expect(buscaBinaria(arr, 5, comparadorNumeros).index).toBe(0);
    expect(buscaBinaria(arr, 25, comparadorNumeros).index).toBe(4);
  });

  test("elemento ausente retorna encontrado falso", () => {
    const arr = [1, 2, 3, 4, 5];
    const r = buscaBinaria(arr, 99, comparadorNumeros);
    expect(r.encontrado).toBe(false);
    expect(r.index).toBe(-1);
  });

  test("array de um unico elemento presente e ausente", () => {
    const arr = [42];
    expect(buscaBinaria(arr, 42, comparadorNumeros).encontrado).toBe(true);
    expect(buscaBinaria(arr, 42, comparadorNumeros).index).toBe(0);
    const ausente = buscaBinaria(arr, 7, comparadorNumeros);
    expect(ausente.encontrado).toBe(false);
    expect(ausente.index).toBe(-1);
  });

  test("array vazio", () => {
    const r = buscaBinaria([], 1, comparadorNumeros);
    expect(r.encontrado).toBe(false);
    expect(r.index).toBe(-1);
    expect(r.comparacoes).toBe(0);
  });

  test("versao recursiva equivale a iterativa", () => {
    const arr = [1, 3, 5, 7, 9, 11, 13, 15];
    for (const chave of [1, 5, 8, 15, 16]) {
      const a = buscaBinaria(arr, chave, comparadorNumeros);
      const b = buscaBinariaRecursiva(arr, chave, comparadorNumeros);
      expect(a.encontrado).toBe(b.encontrado);
      expect(a.index).toBe(b.index);
    }
  });

  test("numero de comparacoes e menor ou igual a log2(n) + 1", () => {
    for (const n of [1, 2, 3, 7, 8, 15, 16, 31, 32, 100, 1000]) {
      const arr = Array.from({ length: n }, (_, i) => i + 1);
      const limite = Math.floor(Math.log2(n)) + 1;
      for (const chave of [1, Math.floor(n / 2), n, n + 1]) {
        const a = buscaBinaria(arr, chave, comparadorNumeros);
        const b = buscaBinariaRecursiva(arr, chave, comparadorNumeros);
        expect(a.comparacoes).toBeLessThanOrEqual(limite);
        expect(b.comparacoes).toBeLessThanOrEqual(limite);
      }
    }
  });
});
