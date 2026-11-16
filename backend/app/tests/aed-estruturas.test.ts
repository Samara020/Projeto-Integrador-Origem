import { ListaEncadeada } from "../src/aed/estruturas/ListaEncadeada";
import { Fila } from "../src/aed/estruturas/Fila";
import { Pilha } from "../src/aed/estruturas/Pilha";
import { GerenciadorEstoque } from "../src/aed/servicos/GerenciadorEstoque";

describe("ListaEncadeada (duplamente encadeada)", () => {
  test("inicia vazia com tamanho zero", () => {
    const lista = new ListaEncadeada<number>();
    expect(lista.tamanho()).toBe(0);
    expect(lista.paraArray()).toEqual([]);
  });

  test("adicionarNoInicio e adicionarNoFim mantêm a ordem", () => {
    const lista = new ListaEncadeada<string>();
    lista.adicionarNoFim("b");
    lista.adicionarNoInicio("a");
    lista.adicionarNoFim("c");
    expect(lista.paraArray()).toEqual(["a", "b", "c"]);
    expect(lista.tamanho()).toBe(3);
  });

  test("obter retorna o elemento pelo indice", () => {
    const lista = new ListaEncadeada<number>();
    lista.adicionarNoFim(10);
    lista.adicionarNoFim(20);
    lista.adicionarNoFim(30);
    expect(lista.obter(0)).toBe(10);
    expect(lista.obter(1)).toBe(20);
    expect(lista.obter(2)).toBe(30);
    expect(lista.obter(-1)).toBeNull();
    expect(lista.obter(3)).toBeNull();
    expect(lista.obter(100)).toBeNull();
  });

  test("removerDoInicio e removerDoFim removem nas extremidades", () => {
    const lista = new ListaEncadeada<number>();
    lista.adicionarNoFim(1);
    lista.adicionarNoFim(2);
    lista.adicionarNoFim(3);
    expect(lista.removerDoInicio()).toBe(1);
    expect(lista.removerDoFim()).toBe(3);
    expect(lista.paraArray()).toEqual([2]);
    expect(lista.tamanho()).toBe(1);
  });

  test("removerDoInicio/Fim em lista vazia retorna null", () => {
    const lista = new ListaEncadeada<number>();
    expect(lista.removerDoInicio()).toBeNull();
    expect(lista.removerDoFim()).toBeNull();
  });

  test("removerPorId remove o primeiro que satisfaz o criterio", () => {
    const lista = new ListaEncadeada<{ id: number; nome: string }>();
    lista.adicionarNoFim({ id: 1, nome: "a" });
    lista.adicionarNoFim({ id: 2, nome: "b" });
    lista.adicionarNoFim({ id: 2, nome: "c" });
    const removido = lista.removerPorId(
      (item: { id: number; nome: string }) => item.id === 2
    );
    expect(removido).toEqual({ id: 2, nome: "b" });
    expect(lista.paraArray()).toEqual([
      { id: 1, nome: "a" },
      { id: 2, nome: "c" },
    ]);
    expect(
      lista.removerPorId((item: { id: number; nome: string }) => item.id === 99)
    ).toBeNull();
  });

  test("inserirOrdenado ordena por comparador (prioridade)", () => {
    const lista = new ListaEncadeada<{ nome: string; prioridade: number }>();
    const comparador = (
      a: { nome: string; prioridade: number },
      b: { nome: string; prioridade: number }
    ) => a.prioridade - b.prioridade;
    lista.inserirOrdenado({ nome: "baixa", prioridade: 5 }, comparador);
    lista.inserirOrdenado({ nome: "alta", prioridade: 1 }, comparador);
    lista.inserirOrdenado({ nome: "media", prioridade: 3 }, comparador);
    expect(
      lista
        .paraArray()
        .map((i: { nome: string; prioridade: number }) => i.nome)
    ).toEqual(["alta", "media", "baixa"]);
  });

  test("limpar esvazia a lista", () => {
    const lista = new ListaEncadeada<number>();
    lista.adicionarNoFim(1);
    lista.adicionarNoFim(2);
    lista.limpar();
    expect(lista.tamanho()).toBe(0);
    expect(lista.paraArray()).toEqual([]);
  });
});

describe("Fila (FIFO, nos encadeados)", () => {
  test("inicia vazia", () => {
    const fila = new Fila<number>();
    expect(fila.estaVazia()).toBe(true);
    expect(fila.tamanho()).toBe(0);
  });

  test("enfileirar e desenfileirar respeitam FIFO", () => {
    const fila = new Fila<string>();
    fila.enfileirar("primeiro");
    fila.enfileirar("segundo");
    fila.enfileirar("terceiro");
    expect(fila.tamanho()).toBe(3);
    expect(fila.espiar()).toBe("primeiro");
    expect(fila.desenfileirar()).toBe("primeiro");
    expect(fila.desenfileirar()).toBe("segundo");
    expect(fila.tamanho()).toBe(1);
    expect(fila.desenfileirar()).toBe("terceiro");
    expect(fila.estaVazia()).toBe(true);
  });

  test("desenfileirar e espiar em fila vazia retornam null", () => {
    const fila = new Fila<number>();
    expect(fila.desenfileirar()).toBeNull();
    expect(fila.espiar()).toBeNull();
  });

  test("paraArray retorna os itens em ordem de entrada", () => {
    const fila = new Fila<number>();
    fila.enfileirar(1);
    fila.enfileirar(2);
    fila.enfileirar(3);
    expect(fila.paraArray()).toEqual([1, 2, 3]);
  });
});

describe("Pilha (LIFO, nos encadeados)", () => {
  test("inicia vazia", () => {
    const pilha = new Pilha<number>();
    expect(pilha.estaVazia()).toBe(true);
    expect(pilha.tamanho()).toBe(0);
  });

  test("empilhar e desempilhar respeitam LIFO", () => {
    const pilha = new Pilha<string>();
    pilha.empilhar("a");
    pilha.empilhar("b");
    pilha.empilhar("c");
    expect(pilha.tamanho()).toBe(3);
    expect(pilha.topo()).toBe("c");
    expect(pilha.desempilhar()).toBe("c");
    expect(pilha.desempilhar()).toBe("b");
    expect(pilha.tamanho()).toBe(1);
    expect(pilha.desempilhar()).toBe("a");
    expect(pilha.estaVazia()).toBe(true);
  });

  test("desempilhar e topo em pilha vazia retornam null", () => {
    const pilha = new Pilha<number>();
    expect(pilha.desempilhar()).toBeNull();
    expect(pilha.topo()).toBeNull();
  });

  test("paraArray retorna do topo para a base", () => {
    const pilha = new Pilha<number>();
    pilha.empilhar(1);
    pilha.empilhar(2);
    pilha.empilhar(3);
    expect(pilha.paraArray()).toEqual([3, 2, 1]);
  });
});

describe("GerenciadorEstoque", () => {
  const gerenciador = new GerenciadorEstoque();

  const produto = {
    produtoId: "prod-1",
    nome: "Bordado de Recife",
    quantidade: 10,
    prioridadeSaida: 2,
    validade: "2027-01-01",
  } as const;

  beforeEach(() => {
    // Cada teste usa um gerenciador novo via factory abaixo; este beforeEach
    // e mantido para nao quebrar a estrutura de descritos aninhados.
  });

  function novoGerenciador() {
    const g = new GerenciadorEstoque();
    g.cadastrarProduto({
      id: 1,
      produtoId: "prod-1",
      nome: "Bordado de Recife",
      quantidade: 10,
      prioridadeSaida: 2,
      validade: new Date("2027-01-01"),
    });
    g.cadastrarProduto({
      id: 2,
      produtoId: "prod-2",
      nome: "Renda de Filé",
      quantidade: 5,
      prioridadeSaida: 1,
      validade: new Date("2026-12-01"),
    });
    return g;
  }

  test("cadastrarProduto ordena por prioridade de saida/validade", () => {
    const g = novoGerenciador();
    const estoque = g.listarEstoque();
    expect(estoque.length).toBe(2);
    expect(estoque[0].produtoId).toBe("prod-2"); // prioridade 1 sai primeiro
    expect(estoque[1].produtoId).toBe("prod-1");
  });

  test("listarEstoque retorna os produtos cadastrados", () => {
    const g = novoGerenciador();
    expect(g.listarEstoque().length).toBe(2);
  });

  test("solicitarPedido enfileira e listarFilaPedidos lista em ordem", () => {
    const g = novoGerenciador();
    g.solicitarPedido({ id: 1, produtoId: "prod-1", quantidade: 2, solicitadoEm: new Date() });
    g.solicitarPedido({ id: 2, produtoId: "prod-2", quantidade: 1, solicitadoEm: new Date() });
    const fila = g.listarFilaPedidos();
    expect(fila.length).toBe(2);
    expect(fila[0].id).toBe(1);
    expect(fila[1].id).toBe(2);
    expect(g.totalOperacoesHistorico()).toBe(0);
  });

  test("processarProximoPedido processa FIFO e da baixa", () => {
    const g = novoGerenciador();
    g.solicitarPedido({ id: 1, produtoId: "prod-1", quantidade: 3, solicitadoEm: new Date() });
    const pedido = g.processarProximoPedido();
    expect(pedido?.id).toBe(1);
    const item = g.listarEstoque().find((i) => i.produtoId === "prod-1");
    expect(item?.quantidade).toBe(7);
    // Fila vazia retorna null
    expect(g.processarProximoPedido()).toBeNull();
  });

  test("darBaixaEstoque reduz o estoque e retorna false se insuficiente", () => {
    const g = novoGerenciador();
    expect(g.darBaixaEstoque("prod-1", 4)).toBe(true);
    expect(g.listarEstoque().find((i) => i.produtoId === "prod-1")?.quantidade).toBe(6);
    expect(g.darBaixaEstoque("prod-1", 100)).toBe(false);
    expect(g.darBaixaEstoque("prod-inexistente", 1)).toBe(false);
    expect(g.darBaixaEstoque("prod-1", 0)).toBe(false);
  });

  test("reporEstoque aumenta o estoque", () => {
    const g = novoGerenciador();
    expect(g.reporEstoque("prod-1", 5)).toBe(true);
    expect(g.listarEstoque().find((i) => i.produtoId === "prod-1")?.quantidade).toBe(15);
    expect(g.reporEstoque("prod-inexistente", 1)).toBe(false);
  });

  test("desfazerUltimaOperacao inverte a ultima baixa (LIFO)", () => {
    const g = novoGerenciador();
    g.darBaixaEstoque("prod-1", 3);
    g.reporEstoque("prod-2", 2);
    expect(g.totalOperacoesHistorico()).toBe(2);

    // Desfaz o reposicao (ultima): prod-2 volta de 7 para 5
    expect(g.desfazerUltimaOperacao()).toBe(true);
    expect(g.listarEstoque().find((i) => i.produtoId === "prod-2")?.quantidade).toBe(5);
    expect(g.totalOperacoesHistorico()).toBe(1);

    // Desfaz a baixa: prod-1 volta de 7 para 10
    expect(g.desfazerUltimaOperacao()).toBe(true);
    expect(g.listarEstoque().find((i) => i.produtoId === "prod-1")?.quantidade).toBe(10);
    expect(g.totalOperacoesHistorico()).toBe(0);

    // Sem mais operacoes: retorna false
    expect(g.desfazerUltimaOperacao()).toBe(false);
  });

  test("cadastrarProduto atualiza produto ja existente", () => {
    const g = novoGerenciador();
    g.cadastrarProduto({
      id: 2,
      produtoId: "prod-2",
      nome: "Renda de Filé Atualizada",
      quantidade: 100,
      prioridadeSaida: 1,
      validade: new Date("2026-12-01"),
    });
    const estoque = g.listarEstoque();
    expect(estoque.length).toBe(2);
    expect(estoque.find((i) => i.produtoId === "prod-2")?.nome).toBe("Renda de Filé Atualizada");
    expect(estoque.find((i) => i.produtoId === "prod-2")?.quantidade).toBe(100);
  });
});
