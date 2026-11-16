"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useSessao } from "@/hooks/useSessao";
import { limparDestinoVolta } from "@/lib/destino";
import type { Papel } from "@/types";

export function GuardaPapel({
  papel,
  children,
}: {
  papel: Papel;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { usuario, pronta } = useSessao();

  useEffect(() => {
    if (!pronta || typeof window === "undefined") return;

    const pathname = window.location.pathname;
    if (pathname === "/entrar" || pathname === "/cadastro") return;

    if (!usuario) {
      const destino = limparDestinoVolta(pathname + window.location.search);
      const url = destino ? `/entrar?volta=${encodeURIComponent(destino)}` : "/entrar";
      router.replace(url);
    }
  }, [pronta, usuario, router]);

  if (!pronta || !usuario) {
    return (
      <div
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-5 px-margem py-6"
        aria-label="Verificando permissões de acesso"
        aria-busy="true"
      >
        <Esqueleto className="h-14 w-full" />
        <Esqueleto className="h-8 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (usuario.papel !== papel) {
    return (
      <div className="mx-auto flex w-full max-w-pagina flex-1 items-center justify-center px-margem py-12">
        <div
          role="alert"
          className="flex max-w-lg flex-col items-center gap-4 rounded-painel border border-borda bg-superficie px-6 py-10 text-center shadow-card"
        >
          <ShieldX className="size-8 text-erro" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="font-titulo text-h2 font-bold text-tinta">
              Área restrita
            </h1>
            <p className="text-apoio text-tinta-2">
              Você não tem permissão para acessar esta área com seu perfil atual.
            </p>
          </div>
          <BotaoLink href="/">Voltar ao início</BotaoLink>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
