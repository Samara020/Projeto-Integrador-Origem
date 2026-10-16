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

// Aceita só caminho interno ("/x"). "//site", "/\site" e "https://" levariam para fora da Origem.
function caminhoInterno(volta: string | null): volta is string {
  return !!volta && volta.startsWith("/") && volta[1] !== "/" && volta[1] !== "\\";
}

export function destinoAposEntrar(papel: Papel, volta: string | null): string {
  if (!caminhoInterno(volta)) return INICIO[papel];
  const restrita = RESTRITAS.find((r) => volta.startsWith(r.prefixo));
  if (restrita && restrita.papel !== papel) return INICIO[papel];
  return volta;
}

// Lido no clique, não no render: evita useSearchParams e o Suspense que ele exige.
export function voltaDaUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("volta");
}
