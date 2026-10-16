// Fake API: POST /auth/register (ContratoDeAPI.md, 2.1)
// Valida e responde como o backend, mas não guarda nada: rota serverless não tem estado.
import { erroJson, simular } from "@/lib/fake-api";
import { CODIGO_CONVITE_ADMIN, usuarios } from "@/mocks";
import type { DadosCadastro, Usuario } from "@/types";

const PAPEIS = ["COMPRADOR", "ARTESAO", "ADMINISTRADOR"];

export async function POST(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const corpo = (await request
    .json()
    .catch(() => null)) as DadosCadastro | null;
  if (!corpo?.nome || !corpo?.email || !corpo?.senha) {
    return erroJson(400, "Preencha nome, e-mail e senha.");
  }
  if (corpo.senha.length < 8) {
    return erroJson(400, "A senha precisa ter pelo menos 8 caracteres.");
  }
  if (!PAPEIS.includes(corpo.papel)) {
    return erroJson(400, "Escolha se você é comprador, artesão ou administrador.");
  }
  if (
    corpo.papel === "ADMINISTRADOR" &&
    corpo.codigoConvite?.trim().toUpperCase() !== CODIGO_CONVITE_ADMIN
  ) {
    return erroJson(403, "Código de convite inválido.");
  }

  const email = corpo.email.trim().toLowerCase();
  if (usuarios.some((u) => u.email === email)) {
    return erroJson(400, "Já existe uma conta com esse e-mail.");
  }

  const usuario: Usuario = {
    id: `usr_${Date.now().toString().slice(-6)}`,
    nome: corpo.nome.trim(),
    email,
    papel: corpo.papel,
    criadoEm: new Date().toISOString(),
  };
  return Response.json(usuario, { status: 201 });
}
