// Para onde cada papel vai depois de entrar ou criar a conta.
import type { Papel } from "@/types";

export const ROTA_PAINEL_ADMIN = "/painel/admin";

const INICIO: Record<Papel, string> = {
  COMPRADOR: "/",
  ARTESAO: "/painel/artesao",
  ADMINISTRADOR: ROTA_PAINEL_ADMIN,
};

// Rotas que só um papel abre. `?volta=` para elas vale só para esse papel.
const RESTRITAS: { prefixo: string; papel: Papel }[] = [
  { prefixo: ROTA_PAINEL_ADMIN, papel: "ADMINISTRADOR" },
  { prefixo: "/painel/artesao", papel: "ARTESAO" },
];

/**
 * Limpa e desfaz URLs aninhadas de volta (ex.: "/entrar?volta=%2Fpainel%2Fadmin").
 * Garante que a rota de destino seja um caminho relativo seguro e nunca aponte
 * para /entrar ou /cadastro, evitando acúmulo de parâmetros e loops de redirecionamento.
 */
export function limparDestinoVolta(volta: string | null | undefined): string | null {
  if (!volta) return null;
  let destino = volta.trim();

  // Desempacota recursivamente voltas aninhadas (/entrar?volta=...)
  while (
    destino &&
    (destino.startsWith("/entrar") ||
      destino.startsWith("/cadastro") ||
      destino.startsWith("entrar") ||
      destino.startsWith("cadastro"))
  ) {
    try {
      const idx = destino.indexOf("?");
      if (idx === -1) {
        return null;
      }
      const params = new URLSearchParams(destino.slice(idx));
      const proximo = params.get("volta");
      if (!proximo || proximo === destino) {
        return null;
      }
      destino = decodeURIComponent(proximo).trim();
    } catch {
      return null;
    }
  }

  // Precisa ser caminho interno seguro (/..., sem // ou /\ e sem auth)
  if (
    !destino.startsWith("/") ||
    destino.startsWith("//") ||
    destino.startsWith("/\\") ||
    destino.startsWith("/entrar") ||
    destino.startsWith("/cadastro")
  ) {
    return null;
  }

  return destino;
}

export function destinoAposEntrar(papel: Papel, volta: string | null): string {
  const limpo = limparDestinoVolta(volta);
  if (!limpo) return INICIO[papel];
  const restrita = RESTRITAS.find((r) => limpo.startsWith(r.prefixo));
  if (restrita && restrita.papel !== papel) return INICIO[papel];
  return limpo;
}

// Lido no clique, não no render: evita useSearchParams e o Suspense que ele exige.
export function voltaDaUrl(): string | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("volta");
  return limparDestinoVolta(param);
}
