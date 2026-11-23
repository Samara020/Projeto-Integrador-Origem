import { describe, beforeEach, test, expect, jest } from "@jest/globals";

jest.mock("../src/repositories/pedido.repository", () => ({
  pedidoRepository: {
    buscarPorId: jest.fn(),
  },
}));

jest.mock("../src/repositories/pagamento.repository", () => ({
  pagamentoRepository: {
    registrarPagamento: jest.fn(),
  },
}));

jest.mock("../src/repositories/usuario.repository", () => ({
  usuarioRepository: {
    buscarPorEmail: jest.fn(),
    atualizarSenha: jest.fn(),
  },
}));

jest.mock("../src/repositories/tentativa-login.repository", () => ({
  tentativaLoginRepository: {
    buscar: jest.fn(),
    registrarFalha: jest.fn(),
    limpar: jest.fn(),
  },
}));

jest.mock("../src/lib/revogacao-token", () => ({
  obterVersaoSessaoUsuario: jest.fn(async () => 1),
  invalidarSessoesUsuario: jest.fn(),
  revogarToken: jest.fn(),
  tokenFoiRevogado: jest.fn(async () => false),
}));

jest.mock("../src/lib/jwt", () => ({
  gerarToken: jest.fn(() => "token-jwt-mock"),
}));

import { pagamentoService } from "../src/services/pagamento.service";
import { authService } from "../src/services/auth.service";
import { pedidoRepository } from "../src/repositories/pedido.repository";
import { pagamentoRepository } from "../src/repositories/pagamento.repository";
import { usuarioRepository } from "../src/repositories/usuario.repository";
import { tentativaLoginRepository } from "../src/repositories/tentativa-login.repository";
import { ErroApp } from "../src/middleware/error";

type MockFn = jest.Mock<(...args: any[]) => any>;
const asMock = (fn: unknown) => fn as MockFn;

describe("pagamentoService (unitário — RN33 e RN38)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const pedidoBase = {
    id: 10,
    usuarioId: 1,
    status: "AGUARDANDO_PAGAMENTO",
    valorFrete: 18,
    itens: [{ subtotal: 100 }],
  };

  test("aprova pagamento válido e retorna status HTTP 200", async () => {
    asMock(pedidoRepository.buscarPorId).mockResolvedValue(pedidoBase);
    asMock(pagamentoRepository.registrarPagamento).mockResolvedValue({
      pagamento: {
        id: 50,
        status: "APROVADO",
        valor: 118,
        data: new Date("2026-11-23T12:00:00Z"),
        motivo: null,
      },
      idempotente: false,
      statusPedido: "PAGO",
      reservaLiberada: false,
    });

    const resultado = await pagamentoService.processar("1", {
      pedidoId: "10",
      metodoPagamento: "PIX",
      tokenCartao: null,
    });

    expect(resultado.httpStatus).toBe(200);
    expect(resultado.corpo.status).toBe("APROVADO");
    expect(resultado.corpo.statusPedido).toBe("PAGO");
    expect(resultado.corpo.valorTotal).toBe(118);
    expect(pagamentoRepository.registrarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "APROVADO",
        novoStatusPedido: "PAGO",
        liberarReserva: false,
      })
    );
  });

  test("RN33 · recusa pagamento com token recusado, cancela pedido e solicita liberação de reserva", async () => {
    asMock(pedidoRepository.buscarPorId).mockResolvedValue(pedidoBase);
    asMock(pagamentoRepository.registrarPagamento).mockResolvedValue({
      pagamento: {
        id: 51,
        status: "RECUSADO",
        valor: 118,
        data: new Date("2026-11-23T12:00:00Z"),
        motivo: "Saldo insuficiente",
      },
      idempotente: false,
      statusPedido: "CANCELADO",
      reservaLiberada: true,
    });

    const resultado = await pagamentoService.processar("1", {
      pedidoId: "10",
      metodoPagamento: "CARTAO_CREDITO",
      tokenCartao: "tok_recusado_saldo",
      motivoFalha: "Saldo insuficiente",
    });

    expect(resultado.httpStatus).toBe(402);
    expect(resultado.corpo.status).toBe("RECUSADO");
    expect(resultado.corpo.statusPedido).toBe("CANCELADO");
    expect(resultado.corpo.reservaLiberada).toBe(true);
    expect(resultado.corpo.mensagem).toBe("Saldo insuficiente");
    expect(pagamentoRepository.registrarPagamento).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "RECUSADO",
        novoStatusPedido: "CANCELADO",
        liberarReserva: true,
        motivo: "Saldo insuficiente",
      })
    );
  });

  test("RN33 · pagamento expirado solicita liberação de reserva e retorna 402", async () => {
    asMock(pedidoRepository.buscarPorId).mockResolvedValue(pedidoBase);
    asMock(pagamentoRepository.registrarPagamento).mockResolvedValue({
      pagamento: {
        id: 52,
        status: "EXPIRADO",
        valor: 118,
        data: new Date("2026-11-23T12:00:00Z"),
        motivo: "Prazo de pagamento expirado.",
      },
      idempotente: false,
      statusPedido: "CANCELADO",
      reservaLiberada: true,
    });

    const resultado = await pagamentoService.processar("1", {
      pedidoId: "10",
      metodoPagamento: "PIX",
      tokenCartao: null,
      resultado: "EXPIRADO",
    });

    expect(resultado.httpStatus).toBe(402);
    expect(resultado.corpo.status).toBe("EXPIRADO");
    expect(resultado.corpo.reservaLiberada).toBe(true);
  });

  test("RN38 · encaminha chave de idempotência mesmo com pedido já PAGO para permitir replay seguro", async () => {
    asMock(pedidoRepository.buscarPorId).mockResolvedValue({
      ...pedidoBase,
      status: "PAGO",
    });
    asMock(pagamentoRepository.registrarPagamento).mockResolvedValue({
      pagamento: {
        id: 50,
        status: "APROVADO",
        valor: 118,
        data: new Date("2026-11-23T12:00:00Z"),
        motivo: null,
      },
      idempotente: true,
      statusPedido: "PAGO",
      reservaLiberada: false,
    });

    const resultado = await pagamentoService.processar("1", {
      pedidoId: "10",
      metodoPagamento: "PIX",
      tokenCartao: null,
      idempotencyKey: "evt-pag-001",
    });

    expect(resultado.httpStatus).toBe(200);
    expect(resultado.corpo.idempotente).toBe(true);
    expect(resultado.corpo.idempotencyKey).toBe("evt-pag-001");
    expect(resultado.corpo.transacaoId).toBe(50);
  });

  test("rejeita pedido já pago com 400 quando não há chave de idempotência", async () => {
    asMock(pedidoRepository.buscarPorId).mockResolvedValue({
      ...pedidoBase,
      status: "PAGO",
    });

    await expect(
      pagamentoService.processar("1", {
        pedidoId: "10",
        metodoPagamento: "PIX",
        tokenCartao: null,
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("authService.login (unitário — TC11 limite de tentativas)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("bloqueia imediatamente com 429 e Retry-After quando conta está em janela de bloqueio", async () => {
    const futuro = new Date(Date.now() + 5 * 60 * 1000);
    asMock(tentativaLoginRepository.buscar).mockResolvedValue({
      email: "bloqueado@teste.com",
      tentativas: 5,
      bloqueadoAte: futuro,
    });

    let erroCapturado: unknown;
    try {
      await authService.login({ email: "bloqueado@teste.com", senha: "qualquer-senha" });
    } catch (erro) {
      erroCapturado = erro;
    }

    expect(erroCapturado).toBeInstanceOf(ErroApp);
    expect((erroCapturado as ErroApp).status).toBe(429);
    expect((erroCapturado as ErroApp).retryAfterSegundos).toBeGreaterThan(0);
    expect(usuarioRepository.buscarPorEmail).not.toHaveBeenCalled();
  });

  test("registra falha em tentativa com senha incorreta e responde 401", async () => {
    asMock(tentativaLoginRepository.buscar).mockResolvedValue(null);
    asMock(usuarioRepository.buscarPorEmail).mockResolvedValue({
      id: 7,
      nome: "Maria",
      email: "maria@teste.com",
      senha: "senha-correta",
      usuarioTipo: "COMPRADOR",
    });

    await expect(
      authService.login({ email: "maria@teste.com", senha: "errada" })
    ).rejects.toMatchObject({ status: 401 });

    expect(tentativaLoginRepository.registrarFalha).toHaveBeenCalledWith("maria@teste.com", 5, 15);
    expect(tentativaLoginRepository.limpar).not.toHaveBeenCalled();
  });

  test("limpa histórico de tentativas após login válido", async () => {
    asMock(tentativaLoginRepository.buscar).mockResolvedValue({
      email: "maria@teste.com",
      tentativas: 3,
      bloqueadoAte: null,
    });
    asMock(usuarioRepository.buscarPorEmail).mockResolvedValue({
      id: 7,
      nome: "Maria",
      email: "maria@teste.com",
      senha: "senha-correta",
      usuarioTipo: "COMPRADOR",
    });

    const res = await authService.login({ email: "maria@teste.com", senha: "senha-correta" });

    expect(res.token).toBe("token-jwt-mock");
    expect(tentativaLoginRepository.limpar).toHaveBeenCalledWith("maria@teste.com");
  });

  test("permite login após expiração do bloqueio temporário", async () => {
    const passado = new Date(Date.now() - 60 * 1000);
    asMock(tentativaLoginRepository.buscar).mockResolvedValue({
      email: "maria@teste.com",
      tentativas: 5,
      bloqueadoAte: passado,
    });
    asMock(usuarioRepository.buscarPorEmail).mockResolvedValue({
      id: 7,
      nome: "Maria",
      email: "maria@teste.com",
      senha: "senha-correta",
      usuarioTipo: "COMPRADOR",
    });

    const res = await authService.login({ email: "maria@teste.com", senha: "senha-correta" });

    expect(res.token).toBe("token-jwt-mock");
    expect(tentativaLoginRepository.limpar).toHaveBeenCalledWith("maria@teste.com");
  });
});
