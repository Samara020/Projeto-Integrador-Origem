import { produtoService } from "../src/services/produto.service";
import { produtoRepository, lojaRepository } from "../src/repositories";

jest.mock("../src/repositories", () => ({
  produtoRepository: {
    buscarPorId: jest.fn(),
    listarPorLoja: jest.fn(),
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
