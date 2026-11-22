import { produtoService } from "../src/services/produto.service";
import { produtoRepository, lojaRepository, categoriaRepository } from "../src/repositories";

jest.mock("../src/repositories", () => ({
  produtoRepository: {
    buscarPorId: jest.fn(),
    listar: jest.fn(),
    listarPorLoja: jest.fn(),
    listarTodos: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    atualizarPausa: jest.fn(),
    atualizarEstoque: jest.fn(),
    atualizarEstoqueEPausa: jest.fn(),
    inativarLogicamente: jest.fn(),
    excluirFisicamente: jest.fn(),
    contarItensPedido: jest.fn(),
  },
  lojaRepository: {
    buscarPorUsuarioId: jest.fn(),
  },
  categoriaRepository: {
    buscarOuCriar: jest.fn(),
  },
}));

describe("produtoService (testes unitários puros sem banco de dados)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listarPeloArtesao calcula contagens exclusivas com base nos campos pausado e estoque do banco", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101, nome: "Ateliê Raiz" });
    (produtoRepository.listarPorLoja as jest.Mock).mockResolvedValue([
      { id: 1, nome: "Peça 1", pausado: false, estoque: { quantidadeDisponivel: 10 }, imagens: [] }, // ATIVO
      { id: 2, nome: "Peça 2", pausado: false, estoque: { quantidadeDisponivel: 3 }, imagens: [] },  // ESTOQUE_BAIXO
      { id: 3, nome: "Peça 3", pausado: false, estoque: { quantidadeDisponivel: 0 }, imagens: [] },  // ESGOTADO
      { id: 4, nome: "Peça 4", pausado: true, estoque: { quantidadeDisponivel: 8 }, imagens: [] },   // INATIVO
    ]);

    const resultado = await produtoService.listarPeloArtesao("usr_1", { situacao: "ESTOQUE_BAIXO" });

    // Apenas a Peça 2 corresponde ao filtro
    expect(resultado.total).toBe(1);
    expect(resultado.itens[0].nome).toBe("Peça 2");
    expect(resultado.itens[0].situacao).toBe("ESTOQUE_BAIXO");

    // Mas a contagem reflete o conjunto completo de todas as 4 peças
    expect(resultado.contagem).toEqual({
      ATIVO: 1,
      INATIVO: 1,
      ESGOTADO: 1,
      ESTOQUE_BAIXO: 1,
    });
  });

  test("atualizarEstoque com pausa persiste pausado no repositório de forma atômica", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
      pecaUnica: false,
      pausado: false,
      estoque: { quantidadeDisponivel: 5 },
    });
    (produtoRepository.atualizarEstoqueEPausa as jest.Mock).mockResolvedValue([]);

    const resultado = await produtoService.atualizarEstoque("201", { pausada: true }, "usr_1");

    expect(produtoRepository.atualizarEstoqueEPausa).toHaveBeenCalledWith(201, {
      pausado: true,
      estoque: undefined,
    });
    expect(resultado.situacao).toBe("INATIVO");
    expect(resultado.estoque).toBe(5);
  });

  test("atualizarEstoque rejeita quantidade inválida sem executar nenhuma escrita de pausa ou estoque", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
      pecaUnica: false,
      pausado: false,
      estoque: { quantidadeDisponivel: 5 },
    });

    // Caso 1: Quantidade negativa com pausa solicitada simultaneamente
    await expect(
      produtoService.atualizarEstoque("201", { estoque: -1, pausada: true }, "usr_1")
    ).rejects.toThrow("A quantidade em estoque deve ser um número inteiro maior ou igual a zero.");

    // Caso 2: Quantidade fracionária
    await expect(
      produtoService.atualizarEstoque("201", { estoque: 2.5, pausada: true }, "usr_1")
    ).rejects.toThrow("A quantidade em estoque deve ser um número inteiro maior ou igual a zero.");

    // Nenhuma gravação deve ter sido disparada
    expect(produtoRepository.atualizarPausa).not.toHaveBeenCalled();
    expect(produtoRepository.atualizarEstoque).not.toHaveBeenCalled();
    expect(produtoRepository.atualizarEstoqueEPausa).not.toHaveBeenCalled();
  });

  test("atualizarEstoque rejeita violação de peça única sem executar nenhuma escrita", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
      pecaUnica: true, // Peça única só aceita estoque <= 1
      pausado: false,
      estoque: { quantidadeDisponivel: 1 },
    });

    await expect(
      produtoService.atualizarEstoque("201", { estoque: 2, pausada: true }, "usr_1")
    ).rejects.toThrow("Peca unica nao pode ter estoque superior a uma unidade.");

    expect(produtoRepository.atualizarPausa).not.toHaveBeenCalled();
    expect(produtoRepository.atualizarEstoque).not.toHaveBeenCalled();
    expect(produtoRepository.atualizarEstoqueEPausa).not.toHaveBeenCalled();
  });

  test("inativar executa exclusão lógica quando há pedidos vinculados", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
    });
    (produtoRepository.contarItensPedido as jest.Mock).mockResolvedValue(2); // tem pedidos
    (produtoRepository.inativarLogicamente as jest.Mock).mockResolvedValue(undefined);

    const resultado = await produtoService.inativar("201", "usr_1");

    expect(produtoRepository.contarItensPedido).toHaveBeenCalledWith(201);
    expect(produtoRepository.inativarLogicamente).toHaveBeenCalledWith(201);
    expect(produtoRepository.excluirFisicamente).not.toHaveBeenCalled();
    expect(resultado.mensagem).toBe("Produto inativado com sucesso.");
  });

  test("inativar executa exclusão física quando não há pedidos vinculados", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
    });
    (produtoRepository.contarItensPedido as jest.Mock).mockResolvedValue(0); // sem pedidos
    (produtoRepository.excluirFisicamente as jest.Mock).mockResolvedValue(undefined);

    const resultado = await produtoService.inativar("201", "usr_1");

    expect(produtoRepository.excluirFisicamente).toHaveBeenCalledWith(201);
    expect(produtoRepository.inativarLogicamente).not.toHaveBeenCalled();
    expect(resultado.mensagem).toBe("Produto inativado com sucesso.");
  });
});

describe("produtoService - persistência de campos F1 (mocks, sem banco de dados)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("criar envia campos F1 ao repository e devolve sku gravado, nao default inventado", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101, nome: "Loja" });
    (categoriaRepository.buscarOuCriar as jest.Mock).mockResolvedValue({ id: 7, nome: "Ceramica" });
    (produtoRepository.criar as jest.Mock).mockResolvedValue({
      id: 301,
      sku: "ORG-LUM-014",
      material: "Barro vermelho",
      dimensoes: "28 x 18 x 18 cm",
      peso: 1.2,
      certificado: "cert.pdf",
      informacoesOrigem: "Caruaru, PE",
      prazoProducaoDias: 12,
      capacidadeProducao: 4,
    });

    const resultado = await produtoService.criar(
      {
        nome: "Luminaria",
        categoria: "Ceramica",
        tecnica: "Manual",
        origem: "Caruaru, PE",
        preco: 145,
        modalidadeProducao: "SOB_ENCOMENDA",
        estoque: 8,
        imagens: ["https://exemplo.com/foto.jpg"],
        sku: "ORG-LUM-014",
        material: "Barro vermelho",
        dimensoes: "28 x 18 x 18 cm",
        peso: 1.2,
        informacoesOrigem: "Caruaru, PE",
        certificado: "cert.pdf",
        prazoProducaoDias: 12,
        capacidadeProducao: 4,
      },
      "usr_1"
    );

    expect(produtoRepository.criar).toHaveBeenCalledTimes(1);
    const dadosCriacao = (produtoRepository.criar as jest.Mock).mock.calls[0][0];
    expect(dadosCriacao.sku).toBe("ORG-LUM-014");
    expect(dadosCriacao.material).toBe("Barro vermelho");
    expect(dadosCriacao.dimensoes).toBe("28 x 18 x 18 cm");
    expect(dadosCriacao.peso).toBe(1.2);
    expect(dadosCriacao.certificado).toBe("cert.pdf");
    expect(dadosCriacao.informacoesOrigem).toBe("Caruaru, PE");
    expect(dadosCriacao.prazoProducaoDias).toBe(12);
    expect(dadosCriacao.capacidadeProducao).toBe(4);
    // sku devolvido eh o gravado pelo repository, nao um default inventado pelo service
    expect(resultado.sku).toBe("ORG-LUM-014");
  });

  test("criar sem sku informado devolve o sku gravado pelo repository (gerado), nao ecoa campo ausente", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101, nome: "Loja" });
    (categoriaRepository.buscarOuCriar as jest.Mock).mockResolvedValue({ id: 7, nome: "Ceramica" });
    (produtoRepository.criar as jest.Mock).mockResolvedValue({ id: 302, sku: "ORG-000302" });

    const resultado = await produtoService.criar(
      {
        nome: "Peca sem SKU",
        categoria: "Ceramica",
        tecnica: "Manual",
        origem: "Caruaru, PE",
        preco: 100,
        modalidadeProducao: "PRONTA_ENTREGA",
        estoque: 1,
        imagens: [],
      },
      "usr_1"
    );

    expect(resultado.sku).toBe("ORG-000302");
  });

  test("atualizar envia campos F1 para o repository", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101 });
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      lojaId: 101,
      pecaUnica: false,
      estoque: { quantidadeDisponivel: 5 },
    });
    (produtoRepository.atualizar as jest.Mock).mockResolvedValue({ id: 201, preco: 150 });

    await produtoService.atualizar(
      "201",
      {
        preco: 150,
        sku: "ORG-000201",
        material: "Barro novo",
        dimensoes: "30 x 20 x 10 cm",
        peso: 2.5,
        certificado: "cert2.pdf",
        informacoesOrigem: "Recife, PE",
        prazoProducaoDias: 5,
        capacidadeProducao: 10,
      },
      "usr_1"
    );

    const dadosAtualizacao = (produtoRepository.atualizar as jest.Mock).mock.calls[0][1];
    expect(dadosAtualizacao.sku).toBe("ORG-000201");
    expect(dadosAtualizacao.material).toBe("Barro novo");
    expect(dadosAtualizacao.dimensoes).toBe("30 x 20 x 10 cm");
    expect(dadosAtualizacao.peso).toBe(2.5);
    expect(dadosAtualizacao.certificado).toBe("cert2.pdf");
    expect(dadosAtualizacao.informacoesOrigem).toBe("Recife, PE");
    expect(dadosAtualizacao.prazoProducaoDias).toBe(5);
    expect(dadosAtualizacao.capacidadeProducao).toBe(10);
  });

  test("buscarPorId devolve valores reais persistidos, sem defaults vazios", async () => {
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue({
      id: 201,
      nome: "Luminaria",
      preco: 145,
      sku: "ORG-000201",
      modalidadeProducao: "SOB_ENCOMENDA",
      imagem: [],
      categoria: { id: 7, nome: "Ceramica" },
      tecnica: "Manual",
      estoque: { quantidadeDisponivel: 8 },
      imagens: [{ url: "https://exemplo.com/foto.jpg" }],
      loja: { id: 101, nome: "Loja", usuario: { id: 10, nome: "Artesao" } },
      material: "Barro vermelho",
      dimensoes: "28 x 18 x 18 cm",
      peso: 1.2,
      certificado: "cert.pdf",
      informacoesOrigem: "Caruaru, PE",
      prazoProducaoDias: 12,
      capacidadeProducao: 4,
    });

    const resultado = await produtoService.buscarPorId("201");

    expect(resultado.sku).toBe("ORG-000201");
    expect(resultado.material).toBe("Barro vermelho");
    expect(resultado.dimensoes).toBe("28 x 18 x 18 cm");
    expect(resultado.peso).toBe(1.2);
    expect(resultado.certificado).toBe("cert.pdf");
    expect(resultado.informacoesOrigem).toBe("Caruaru, PE");
    expect(resultado.prazoProducaoDias).toBe(12);
    expect(resultado.capacidadeProducao).toBe(4);
    // nao eh default vazio nem inventado
    expect(resultado.material).not.toBe("");
    expect(resultado.dimensoes).not.toBe("");
  });

  test("listar devolve campos F1 dos produtos do banco", async () => {
    (produtoRepository.listar as jest.Mock).mockResolvedValue([1, [
      {
        id: 201,
        nome: "Luminaria",
        preco: 145,
        sku: "ORG-000201",
        imagens: [{ url: "https://exemplo.com/foto.jpg" }],
        loja: { id: 101, usuario: { id: 10, nome: "Artesao" } },
        origem: "Caruaru, PE",
        modalidadeProducao: "SOB_ENCOMENDA",
        pausado: false,
        excluido: false,
        estoque: { quantidadeDisponivel: 8 },
        material: "Barro vermelho",
        dimensoes: "28 x 18 x 18 cm",
        peso: 1.2,
        certificado: "cert.pdf",
        informacoesOrigem: "Caruaru, PE",
        prazoProducaoDias: 12,
        capacidadeProducao: 4,
      },
    ]]);

    const resultado = await produtoService.listar({});

    expect(resultado.itens[0].sku).toBe("ORG-000201");
    expect(resultado.itens[0].material).toBe("Barro vermelho");
    expect(resultado.itens[0].dimensoes).toBe("28 x 18 x 18 cm");
    expect(resultado.itens[0].peso).toBe(1.2);
    expect(resultado.itens[0].certificado).toBe("cert.pdf");
    expect(resultado.itens[0].informacoesOrigem).toBe("Caruaru, PE");
    expect(resultado.itens[0].prazoProducaoDias).toBe(12);
    expect(resultado.itens[0].capacidadeProducao).toBe(4);
  });

  test("listarPeloArtesao devolve sku gravado no banco, nao skuDe inventado", async () => {
    (lojaRepository.buscarPorUsuarioId as jest.Mock).mockResolvedValue({ id: 101, nome: "Loja" });
    (produtoRepository.listarPorLoja as jest.Mock).mockResolvedValue([
      { id: 1, nome: "Peca A", sku: "ORG-REAL-001", pausado: false, estoque: { quantidadeDisponivel: 10 }, imagens: [] },
      { id: 2, nome: "Peca B", sku: null, pausado: false, estoque: { quantidadeDisponivel: 3 }, imagens: [] },
    ]);

    const resultado = await produtoService.listarPeloArtesao("usr_1", {});

    expect(resultado.itens[0].sku).toBe("ORG-REAL-001");
    // quando nao ha sku gravado, devolve null (valor real do banco), nunca um skuDe inventado
    expect(resultado.itens[1].sku).toBeNull();
  });

  test("listarPendentes devolve informacoesOrigem e certificado reais do banco", async () => {
    (produtoRepository.listarTodos as jest.Mock).mockResolvedValue([
      {
        id: 201,
        nome: "Luminaria",
        imagens: [{ url: "https://exemplo.com/foto.jpg" }],
        loja: { id: 101, usuario: { id: 10, nome: "Artesao" } },
        tecnica: "Manual",
        origem: "Caruaru, PE",
        sku: "ORG-000201",
        material: "Barro vermelho",
        dimensoes: "28 x 18 x 18 cm",
        peso: 1.2,
        certificado: "cert.pdf",
        informacoesOrigem: "Caruaru, PE",
        prazoProducaoDias: 12,
        capacidadeProducao: 4,
        enviadoEm: new Date("2026-09-01T10:00:00Z"),
      },
    ]);

    const resultado = await produtoService.listarPendentes({});

    expect(resultado.itens[0].informacoesOrigem).toBe("Caruaru, PE");
    expect(resultado.itens[0].certificado).toBe("cert.pdf");
    expect(resultado.itens[0].sku).toBe("ORG-000201");
    expect(resultado.itens[0].enviadoEm).toBeTruthy();
    // nao sao defaults vazios/nulos inventados
    expect(resultado.itens[0].informacoesOrigem).not.toBe("");
    expect(resultado.itens[0].certificado).not.toBeNull();
  });
});
