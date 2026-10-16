// Único lugar do frontend que chama fetch.
// Avaliação 2: defina NEXT_PUBLIC_API_URL com o endereço do backend. Nada mais muda aqui.
import { lerLocal } from "@/lib/armazenamento";
import type { Sessao } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "ApiError";
    this.status = status;
  }
}

type Parametros = Record<string, string | number | boolean | undefined>;

type Opcoes = {
  metodo?: "GET" | "POST" | "PUT" | "DELETE";
  corpo?: unknown;
  parametros?: Parametros;
  sinal?: AbortSignal;
  baseUrl?: string;
};

function montarUrl(caminho: string, parametros?: Parametros, base = BASE): string {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== "" && valor !== false) {
      busca.set(chave, String(valor));
    }
  }

  // Repassa ?_erro=500 da página para a Fake API, para testar a tela de erro.
  if (base === "/api" && typeof window !== "undefined") {
    const erro = new URLSearchParams(window.location.search).get("_erro");
    if (erro) busca.set("_erro", erro);
  }

  const query = busca.toString();
  return `${base}${caminho}${query ? `?${query}` : ""}`;
}

export async function http<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const cabecalhos: Record<string, string> = { Accept: "application/json" };
  if (opcoes.corpo !== undefined) {
    cabecalhos["Content-Type"] = "application/json";
  }

  const sessao = lerLocal<Sessao>("sessao");
  if (sessao) cabecalhos.Authorization = `${sessao.tipo} ${sessao.token}`;

  let resposta: Response;
  try {
    resposta = await fetch(montarUrl(caminho, opcoes.parametros, opcoes.baseUrl), {
      method: opcoes.metodo ?? "GET",
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: opcoes.sinal,
    });
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === "AbortError") {
      throw causa;
    }
    throw new ApiError(0, "Sem conexão. Confira sua internet e tente de novo.");
  }

  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados.mensagem === "string"
        ? dados.mensagem
        : "Algo deu errado do nosso lado. Tente de novo em instantes.";
    throw new ApiError(resposta.status, mensagem);
  }

  return dados as T;
}
