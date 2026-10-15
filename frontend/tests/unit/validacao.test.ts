// TC01, TC11 e TC06: particionamento de equivalência e valor-limite dos campos de
// login, cadastro e checkout (lib/validacao.ts). undefined = campo aceito.
import {
  validarCep,
  validarCvv,
  validarEmail,
  validarNome,
  validarNumero,
  validarNumeroCartao,
  validarRua,
  validarSenhaLogin,
  validarSenhaNova,
  validarValidadeCartao,
} from "@/lib/validacao";

describe("TC01/TC11 · e-mail e senha do login", () => {
  test.each([
    ["comprador@origem.dev", undefined],
    ["  artesao@origem.dev  ", undefined],
    ["", "Digite seu e-mail."],
    ["   ", "Digite seu e-mail."],
    ["comprador@origem", "Esse e-mail parece incompleto."],
    ["comprador.origem.dev", "Esse e-mail parece incompleto."],
    ["com prador@origem.dev", "Esse e-mail parece incompleto."],
  ])("validarEmail(%j) devolve %j", (valor, esperado) => {
    expect(validarEmail(valor)).toBe(esperado);
  });

  test.each([
    ["origem123", undefined],
    ["", "Digite sua senha."],
  ])("validarSenhaLogin(%j) devolve %j", (valor, esperado) => {
    expect(validarSenhaLogin(valor)).toBe(esperado);
  });
});

describe("TC01 · cadastro de conta", () => {
  test.each([
    ["Ana", undefined],
    ["  Ana Souza ", undefined],
    ["Al", "Digite seu nome completo."],
    ["   ", "Digite seu nome completo."],
  ])("validarNome(%j) devolve %j", (valor, esperado) => {
    expect(validarNome(valor)).toBe(esperado);
  });

  test.each([
    ["1234567", "Use pelo menos 8 caracteres."],
    ["12345678", undefined],
    ["", "Use pelo menos 8 caracteres."],
  ])("validarSenhaNova: limite de 8 caracteres (%j)", (valor, esperado) => {
    expect(validarSenhaNova(valor)).toBe(esperado);
  });
});

describe("TC06 · endereço de entrega do checkout", () => {
  test.each([
    ["50030-230", undefined],
    ["50030230", undefined],
    ["5003-230", "Digite um CEP válido."],
    ["50030-2301", "Digite um CEP válido."],
    ["abcde-fgh", "Digite um CEP válido."],
    ["", "Digite um CEP válido."],
  ])("validarCep(%j) devolve %j", (valor, esperado) => {
    expect(validarCep(valor)).toBe(esperado);
  });

  test.each([
    ["Rua", undefined],
    ["Ru", "Digite o nome da rua."],
  ])("validarRua(%j) devolve %j", (valor, esperado) => {
    expect(validarRua(valor)).toBe(esperado);
  });

  test.each([
    ["12", undefined],
    ["  ", "Digite o número."],
  ])("validarNumero(%j) devolve %j", (valor, esperado) => {
    expect(validarNumero(valor)).toBe(esperado);
  });
});

describe("TC06 · dados do cartão", () => {
  test.each([
    ["4111 1111 1111 1111", undefined],
    ["4111111111111111", undefined],
    ["4111 1111 1111 111", "Digite os 16 números do cartão."],
    ["4111 1111 1111 11111", "Digite os 16 números do cartão."],
  ])("validarNumeroCartao(%j) devolve %j", (valor, esperado) => {
    expect(validarNumeroCartao(valor)).toBe(esperado);
  });

  test.each([
    ["01/30", undefined],
    ["12 / 30", undefined],
    ["00/30", "Use o formato MM / AA."],
    ["13/30", "Use o formato MM / AA."],
    ["1/30", "Use o formato MM / AA."],
  ])("validarValidadeCartao(%j) devolve %j", (valor, esperado) => {
    expect(validarValidadeCartao(valor)).toBe(esperado);
  });

  test.each([
    ["123", undefined],
    ["1234", undefined],
    ["12", "Digite o código de segurança."],
    ["12345", "Digite o código de segurança."],
    ["abc", "Digite o código de segurança."],
    ["12a", "Digite o código de segurança."],
    ["1 23", "Digite o código de segurança."],
  ])("validarCvv(%j) devolve %j", (valor, esperado) => {
    expect(validarCvv(valor)).toBe(esperado);
  });
});
