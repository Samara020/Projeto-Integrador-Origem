// Único lugar do frontend que executa requisições HTTP para o backend Express.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apagarLocal, lerLocal } from "@/lib/armazenamento";
import { limparDestinoVolta } from "@/lib/destino";
import { sessaoStore } from "@/store/sessao";
import type { Sessao } from "@/types";

function obterBaseUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.API_BASE_URL ??
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:4000"
    );
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

const BASE = obterBaseUrl();
const EM_TESTE = process.env.NODE_ENV === "test";
if (typeof window !== "undefined" && !EM_TESTE) {
  console.log("[Origem HTTP] Conectado ao backend:", BASE);
}

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

function normalizarCaminhoBackend(caminho: string): string {
  if (
    caminho.startsWith("/produtos/admin/") ||
    caminho.startsWith("/produtos/artesao/") ||
    caminho.startsWith("/painel/") ||
    caminho.startsWith("/avaliacoes/")
  ) {
    return caminho;
  }

  if (caminho.startsWith("/admin/produtos/")) {
    return `/produtos${caminho}`;
  }
  if (caminho === "/artesao/pecas" || caminho.startsWith("/artesao/pecas/")) {
    return `/produtos${caminho}`;
  }
  if (
    caminho.startsWith("/admin/perfil") ||
    caminho.startsWith("/admin/senha") ||
    caminho.startsWith("/admin/painel/") ||
    caminho.startsWith("/artesao/painel/") ||
    caminho.startsWith("/artesao/envio/") ||
    caminho.startsWith("/envios/")
  ) {
    return `/painel${caminho}`;
  }
  if (
    caminho === "/admin/avaliacoes" ||
    caminho.startsWith("/admin/avaliacoes/") ||
    /^\/produtos\/[^/]+\/avaliacoes$/.test(caminho)
  ) {
    return `/avaliacoes${caminho}`;
  }

  return caminho;
}

function montarUrl(caminho: string, parametros?: Parametros, base = BASE): string {
  const caminhoFinal = normalizarCaminhoBackend(caminho);
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== "" && valor !== false) {
      busca.set(chave, String(valor));
    }
  }

  const query = busca.toString();
  return `${base}${caminhoFinal}${query ? `?${query}` : ""}`;
}

export const navegacaoHttp = {
  irPara(url: string) {
    window.location.assign(url);
  },
};

export function urlLoginSessaoExpirada(destinoAtual: string): string {
  const destino = limparDestinoVolta(destinoAtual);
  const params = new URLSearchParams({ motivo: "sessao-expirada" });
  if (destino) params.set("volta", destino);
  return `/entrar?${params.toString()}`;
}

export const cliente = axios.create();

cliente.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const sessao = lerLocal<Sessao>("sessao");
  if (sessao?.token) {
    config.headers.Authorization = `${sessao.tipo} ${sessao.token}`;
  }
  config.headers.Accept = "application/json";
  return config;
});

cliente.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError) => {
    const url = erro.config?.url ?? "";
    const ehRotaDeAuth =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/recuperar-senha") ||
      url.includes("/auth/redefinir-senha");

    if (erro.response?.status === 401 && !ehRotaDeAuth && typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const naPaginaDeEntrada =
        pathname === "/entrar" ||
        pathname.startsWith("/entrar/") ||
        pathname === "/cadastro" ||
        pathname.startsWith("/cadastro/");

      apagarLocal("sessao");
      sessaoStore.definir(null);

      if (!naPaginaDeEntrada) {
        navegacaoHttp.irPara(urlLoginSessaoExpirada(pathname + window.location.search));
      }
    }
    return Promise.reject(erro);
  },
);

export async function http<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const base = opcoes.baseUrl ?? obterBaseUrl();
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

    if (erro.name === "CanceledError" || (erro as { name?: string }).name === "AbortError") {
      throw causa;
    }

    const status = erro.response?.status ?? 0;
    const mensagem =
      erro.response?.data?.mensagem ||
      erro.message ||
      "Algo deu errado do nosso lado. Tente de novo em instantes.";

    if (typeof window !== "undefined" && !EM_TESTE) {
      console.error(
        `[Origem HTTP Erro] ${opcoes.metodo ?? "GET"} ${url} (${status}):`,
        erro.response?.data ?? erro.message,
      );
    }

    if (!erro.response) {
      throw new ApiError(
        0,
        "Sem conexao com o backend. Confira se o backend está rodando na porta 4000 e tente de novo."
      );
    }

    throw new ApiError(status, mensagem);
  }
}
