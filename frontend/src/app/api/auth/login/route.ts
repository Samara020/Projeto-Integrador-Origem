// Fake API: POST /auth/login (ContratoDeAPI.md, 2.1)
import { erroJson, simular } from "@/lib/fake-api";
import { SENHA_DEMO, usuarios } from "@/mocks";
import type { DadosLogin, Sessao } from "@/types";

export async function POST(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const corpo = (await request.json().catch(() => null)) as DadosLogin | null;
  if (!corpo?.email || !corpo?.senha) {
    return erroJson(400, "Informe e-mail e senha.");
  }

  const email = corpo.email.trim().toLowerCase();
  const usuario = usuarios.find((u) => u.email === email);
  const ehContaDemo = ["comprador@origem.dev", "artesao@origem.dev", "admin@origem.dev"].includes(email);
  if (!usuario || (ehContaDemo ? corpo.senha !== SENHA_DEMO : corpo.senha.length < 8)) {
    return erroJson(401, "E-mail ou senha incorretos.");
  }

  const sessao: Sessao = {
    token: `fake.${btoa(usuario.id)}.${Date.now()}`,
    tipo: "Bearer",
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
  };
  return Response.json(sessao);
}
