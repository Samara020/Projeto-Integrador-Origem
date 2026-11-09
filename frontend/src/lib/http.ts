// Único lugar do frontend que chama requisicoes HTTP.
// Avaliação 2: defina NEXT_PUBLIC_API_URL com o endereço do backend. Nada mais muda aqui.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
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

const cliente = axios.create();

cliente.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const sessao = lerLocal<Sessao>("sessao");
  if (sessao?.token) {
    config.headers.Authorization = `${sessao.tipo} ${sessao.token}`;
  }
  config.headers.Accept = "application/json";
  return config;
});

export async function http<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const base = opcoes.baseUrl ?? BASE;
  const url = montarUrl(caminho, opcoes.parametros, base);

  let resposta;
  try {
    resposta = await cliente.request<T>({
      url,
      method: opcoes.metodo ?? "GET",
      data: opcoes.corpo,
      signal: opcoes.sinal,
      headers: {
        "Content-Type": opcoes.corpo !== undefined ? "application/json" : undefined,
      },
    });
    return resposta.data as T;
  } catch (causa: unknown) {
    const erro = causa as AxiosError<{ mensagem?: string }>;

    if (erro.name === "CanceledError" || erro.name === "AbortError") {
      throw causa;
    }

    if (!erro.response) {
      throw new ApiError(
        0,
        "Sem conexao. Confira sua internet e tente de novo."
      );
    }

    const mensagem =
      erro.response.data?.mensagem ||
      "Algo deu errado do nosso lado. Tente de novo em instantes.";
    throw new ApiError(erro.response.status, mensagem);
  }
}
