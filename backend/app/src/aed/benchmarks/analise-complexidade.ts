import { performance } from "perf_hooks";
import {
  ListaEncadeada,
  Fila,
  Pilha,
  TabelaHash,
  ArvoreBinariaBusca,
  buscaBinaria,
  GerenciadorEstoque,
  ItemEstoque,
} from "../index";

interface ProdutoSintetico {
  id: number;
  codigo: string;
  nome: string;
  preco: number;
  prioridadeSaida: number;
  validade: Date;
}

function gerarDadosSinteticos(quantidade: number): ProdutoSintetico[] {
  const produtos: ProdutoSintetico[] = [];
  const categorias = ["Ceramica", "Madeira", "Xilogravura", "Renda", "Couro"];
  const agora = Date.now();

  for (let i = 1; i <= quantidade; i++) {
    const cat = categorias[i % categorias.length];
    // Dias para vencer variando de 1 a 365
    const diasValidade = (i * 37) % 365 + 1;
    produtos.push({
      id: i,
      codigo: `PRD-${String(i).padStart(6, "0")}`,
      nome: `Peca Artesanal ${cat} #${i}`,
      preco: Number((20 + (i * 13) % 500).toFixed(2)),
      prioridadeSaida: (i * 7) % 10 + 1,
      validade: new Date(agora + diasValidade * 24 * 60 * 60 * 1000),
    });
  }

  return produtos;
}

interface MetricaVolume {
  volume: number;
  hashInsercaoMs: number;
  hashBuscaMs: number;
  bstInsercaoMs: number;
  bstBuscaMs: number;
  buscaBinariaMs: number;
  buscaBinariaComparacoesMedia: number;
  listaLinearBuscaMs: number;
  filaOperacoesMs: number;
  pilhaDesfazerMs: number;
}

export function executarBenchmarks(volumes: number[] = [100, 1000, 10000, 50000]): MetricaVolume[] {
  console.log("================================================================================");
  console.log("  ORIGEM · BENCHMARK E ANÁLISE DE COMPLEXIDADE DE ESTRUTURAS DE DADOS (AED)    ");
  console.log("================================================================================\n");

  const resultados: MetricaVolume[] = [];

  for (const n of volumes) {
    console.log(`--> Executando testes com volume sintético: N = ${n.toLocaleString("pt-BR")} itens...`);
    const produtos = gerarDadosSinteticos(n);

    // Amostra para buscas (100 buscas representativas em posições aleatórias)
    const qtdBuscas = Math.min(100, n);
    const indicesBusca = Array.from({ length: qtdBuscas }, (_, i) =>
      Math.floor((i * (n - 1)) / qtdBuscas)
    );
    const amostras = indicesBusca.map((idx) => produtos[idx]);

    // 1. Tabela Hash (Índice de estoque por código)
    const tabelaHash = new TabelaHash<string, ProdutoSintetico>(Math.max(16, Math.floor(n / 2)));
    const t0HashIns = performance.now();
    for (const p of produtos) {
      tabelaHash.inserir(p.codigo, p);
    }
    const hashInsercaoMs = performance.now() - t0HashIns;

    const t0HashBusca = performance.now();
    for (const a of amostras) {
      tabelaHash.buscar(a.codigo);
    }
    const hashBuscaMs = performance.now() - t0HashBusca;

    // 2. Árvore Binária de Busca (BST por ID do produto)
    // Inserção em ordem pseudo-aleatória embaralhada para evitar degeneração em lista simples
    const produtosEmbaralhados = [...produtos].sort(() => ((produtos.length * 31) % 2 === 0 ? 1 : -1));
    const bst = new ArvoreBinariaBusca<ProdutoSintetico>((a, b) => a.id - b.id);
    const t0BstIns = performance.now();
    for (const p of produtosEmbaralhados) {
      bst.inserir(p);
    }
    const bstInsercaoMs = performance.now() - t0BstIns;

    const t0BstBusca = performance.now();
    for (const a of amostras) {
      bst.buscar(a.id, (dado, id) => dado.id - id);
    }
    const bstBuscaMs = performance.now() - t0BstBusca;

    // 3. Busca Binária (Array previamente ordenado por ID)
    const arrayOrdenado = [...produtos].sort((a, b) => a.id - b.id);
    let totalComparacoes = 0;
    const t0BuscaBinaria = performance.now();
    for (const a of amostras) {
      const res = buscaBinaria(arrayOrdenado, a.id, (item, id) => item.id - id);
      totalComparacoes += res.comparacoes;
    }
    const buscaBinariaMs = performance.now() - t0BuscaBinaria;
    const buscaBinariaComparacoesMedia = totalComparacoes / qtdBuscas;

    // 4. Busca Linear em Lista Encadeada (para contrastar O(n) vs O(log n) e O(1))
    // Usamos uma amostra menor em volumes gigantes para não travar a medição
    let listaLinearBuscaMs = 0;
    if (n <= 10000) {
      const lista = new ListaEncadeada<ProdutoSintetico>();
      for (const p of produtos) {
        lista.adicionarNoFim(p);
      }
      const t0Lista = performance.now();
      const itensLista = lista.paraArray();
      for (const a of amostras) {
        itensLista.find((p) => p.codigo === a.codigo);
      }
      listaLinearBuscaMs = performance.now() - t0Lista;
    } else {
      // Projeção teórica proporcional para N > 10.000 se não executado
      listaLinearBuscaMs = -1;
    }

    // 5. Fila FIFO de Requisições de Pedidos (O(1))
    const fila = new Fila<ProdutoSintetico>();
    const t0Fila = performance.now();
    for (const p of produtos) {
      fila.enfileirar(p);
    }
    for (let i = 0; i < n; i++) {
      fila.desenfileirar();
    }
    const filaOperacoesMs = performance.now() - t0Fila;

    // 6. Pilha LIFO de Desfazer Operações (O(1))
    const pilha = new Pilha<ProdutoSintetico>();
    const t0Pilha = performance.now();
    for (const p of produtos) {
      pilha.empilhar(p);
    }
    for (let i = 0; i < n; i++) {
      pilha.desempilhar();
    }
    const pilhaDesfazerMs = performance.now() - t0Pilha;

    resultados.push({
      volume: n,
      hashInsercaoMs: Number(hashInsercaoMs.toFixed(3)),
      hashBuscaMs: Number(hashBuscaMs.toFixed(4)),
      bstInsercaoMs: Number(bstInsercaoMs.toFixed(3)),
      bstBuscaMs: Number(bstBuscaMs.toFixed(4)),
      buscaBinariaMs: Number(buscaBinariaMs.toFixed(4)),
      buscaBinariaComparacoesMedia: Number(buscaBinariaComparacoesMedia.toFixed(1)),
      listaLinearBuscaMs: listaLinearBuscaMs >= 0 ? Number(listaLinearBuscaMs.toFixed(3)) : -1,
      filaOperacoesMs: Number(filaOperacoesMs.toFixed(3)),
      pilhaDesfazerMs: Number(pilhaDesfazerMs.toFixed(3)),
    });
  }

  // Exibição dos resultados em tabela formatada
  console.log("\n================================================================================");
  console.log("  TABELA RESUMO: TEMPO DE EXECUÇÃO (MILISSEGUNDOS) POR VOLUME DE DADOS          ");
  console.log("================================================================================");
  console.table(
    resultados.map((r) => ({
      Volume: r.volume.toLocaleString("pt-BR"),
      "Hash Ins (ms)": r.hashInsercaoMs,
      "Hash Busca (ms)": r.hashBuscaMs,
      "BST Ins (ms)": r.bstInsercaoMs,
      "BST Busca (ms)": r.bstBuscaMs,
      "Busca Bin (ms)": r.buscaBinariaMs,
      "Média Comp. Bin": r.buscaBinariaComparacoesMedia,
      "Busca Linear (ms)": r.listaLinearBuscaMs >= 0 ? r.listaLinearBuscaMs : "N/A (O(N))",
      "Fila O(1) (ms)": r.filaOperacoesMs,
      "Pilha O(1) (ms)": r.pilhaDesfazerMs,
    }))
  );

  // Verificação empírica do Gerenciador de Estoque com inserção ordenada e Desfazer
  console.log("\n--> Verificação do fluxo comercial com GerenciadorEstoque (Lista + Fila + Pilha):");
  const gerenciador = new GerenciadorEstoque();
  gerenciador.cadastrarProduto({
    id: 1,
    produtoId: "prd_201",
    nome: "Vaso de Barro Vitrificado",
    quantidade: 10,
    prioridadeSaida: 2,
    validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  gerenciador.cadastrarProduto({
    id: 2,
    produtoId: "prd_202",
    nome: "Queijo Artesanal Curado",
    quantidade: 5,
    prioridadeSaida: 1, // Maior prioridade de saída (vence antes)
    validade: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  console.log("Estoque inicial ordenado por prioridade de saída/validade:");
  console.log(gerenciador.listarEstoque().map((i) => `[Prioridade ${i.prioridadeSaida}] ${i.nome} - Qtd: ${i.quantidade}`));

  // Simula pedido e baixa
  gerenciador.solicitarPedido({
    id: "ped_01",
    produtoId: "prd_202",
    quantidade: 3,
    solicitadoEm: new Date(),
  });
  const atendido = gerenciador.processarProximoPedido();
  console.log(`Processado pedido da fila (FIFO): ID=${atendido?.id}, Produto=${atendido?.produtoId}, Quantidade=${atendido?.quantidade}`);
  console.log("Estoque pós-venda:", gerenciador.listarEstoque().map((i) => `${i.nome}: ${i.quantidade}`));

  // Desfaz a venda por arrependimento/erro
  const desfeitoSucesso = gerenciador.desfazerUltimaOperacao();
  console.log(`Desfazer última operação (LIFO via Pilha): Sucesso? ${desfeitoSucesso}`);
  console.log("Estoque pós-desfazer (restaurado):", gerenciador.listarEstoque().map((i) => `${i.nome}: ${i.quantidade}`));
  console.log("\n================================================================================\n");

  return resultados;
}

if (require.main === module) {
  executarBenchmarks();
}
