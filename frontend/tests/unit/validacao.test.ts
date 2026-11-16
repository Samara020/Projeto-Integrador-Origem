// TC01, TC11 e TC06: particionamento de equivalência e valor-limite dos campos de
// login, cadastro e checkout (lib/validacao.ts). undefined = campo aceito.
import {
  validarCadastro,
  validarCep,
  validarConvite,
  validarCvv,
  validarEmail,
  validarNome,
  validarNumero,
  validarNumeroCartao,
  validarRua,
  validarSenhaLogin,
  validarSenhaNova,
  validarValidadeCartao,
  type DadosCadastro,
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

// Regras do formulário de cadastro por perfil. As mensagens são as mesmas que a tela
// /cadastro já mostrava quando a validação morava dentro do componente.
describe("TC01 · regras do cadastro por perfil", () => {
  const valido: DadosCadastro = {
    papel: "COMPRADOR",
    nome: "Ana Souza",
    email: "ana@origem.dev",
    senha: "12345678",
    tecnica: "",
    regiao: "",
    convite: "",
    termos: true,
  };
  const vazio = { nome: "", email: "", senha: "", termos: false };
  const errosBasicos = {
    nome: "Digite seu nome completo.",
    email: "Digite seu e-mail.",
    senha: "Use pelo menos 8 caracteres.",
    termos: "Aceite os termos para criar a conta.",
  };

  test("comprador válido passa sem técnica, região nem convite", () => {
    expect(validarCadastro(valido)).toEqual({});
  });

  test("formulário vazio de comprador aponta nome, e-mail, senha e termos", () => {
    expect(validarCadastro({ ...valido, ...vazio })).toEqual(errosBasicos);
  });

  test("formulário vazio de artesão também exige técnica e região", () => {
    expect(validarCadastro({ ...valido, ...vazio, papel: "ARTESAO" })).toEqual({
      ...errosBasicos,
      tecnica: "Escolha sua técnica principal.",
      regiao: "Escolha a região onde você produz.",
    });
  });

  test("formulário vazio de administrador também exige o convite", () => {
    expect(validarCadastro({ ...valido, ...vazio, papel: "ADMINISTRADOR" })).toEqual({
      ...errosBasicos,
      convite: "Digite o código de convite.",
    });
  });

  test("artesão com técnica e região passa", () => {
    expect(
      validarCadastro({ ...valido, papel: "ARTESAO", tecnica: "ceramica", regiao: "agreste" }),
    ).toEqual({});
  });

  test("artesão sem região só aponta a região", () => {
    expect(validarCadastro({ ...valido, papel: "ARTESAO", tecnica: "ceramica" })).toEqual({
      regiao: "Escolha a região onde você produz.",
    });
  });

  test("administrador com convite passa", () => {
    expect(
      validarCadastro({ ...valido, papel: "ADMINISTRADOR", convite: "ORIGEM-2026" }),
    ).toEqual({});
  });

  test("termos desmarcados barram qualquer perfil", () => {
    expect(validarCadastro({ ...valido, termos: false })).toEqual({
      termos: "Aceite os termos para criar a conta.",
    });
  });

  test.each([
    ["ORIGEM-2026", undefined],
    ["", "Digite o código de convite."],
    ["   ", "Digite o código de convite."],
  ])("validarConvite(%j) devolve %j", (valor, esperado) => {
    expect(validarConvite(valor)).toBe(esperado);
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
