"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Filtro único do painel mora na URL, como no catálogo: o link pode ser
// compartilhado e o botão voltar funciona.
export function useFiltroUrl(chave: string) {
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();
  const valor = parametros.get(chave) ?? "";

  function definir(novo: string) {
    const novos = new URLSearchParams(parametros.toString());
    if (novo) novos.set(chave, novo);
    else novos.delete(chave);

    const busca = novos.toString();
    router.push(busca ? `${pathname}?${busca}` : pathname);
  }

  return { valor, definir };
}
