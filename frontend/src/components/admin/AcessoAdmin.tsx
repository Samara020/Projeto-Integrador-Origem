"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useSessao } from "@/hooks/useSessao";
import { ROTA_PAINEL_ADMIN } from "@/lib/destino";

// Guarda de tela. Quem protege o dado de verdade é o backend (403 em /admin/*) na Avaliação 2.
export function AcessoAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { usuario, pronta, sair } = useSessao();
  const semConta = pronta && !usuario;

  useEffect(() => {
    if (semConta) {
      router.replace(`/entrar?volta=${encodeURIComponent(ROTA_PAINEL_ADMIN)}`);
    }
  }, [semConta, router]);

  if (!pronta || !usuario) {
    return (
      <div
        className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-5 px-margem py-6"
        aria-label="Verificando acesso ao painel"
        aria-busy="true"
      >
        <Esqueleto className="h-14 w-full" />
        <Esqueleto className="h-8 w-80 max-w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Esqueleto key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (usuario.papel !== "ADMINISTRADOR") {
    return (
      <div className="mx-auto flex w-full max-w-pagina flex-1 items-center justify-center px-margem py-12">
        <div
          role="alert"
          className="flex max-w-lg flex-col items-center gap-4 rounded-painel border border-borda bg-superficie px-6 py-10 text-center shadow-card"
        >
          <ShieldX className="size-8 text-erro" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="font-titulo text-h2 font-bold text-tinta">
              Área restrita à administração
            </h1>
            <p className="text-apoio text-tinta-2">
              Você entrou como {usuario.nome}. Este painel abre só para contas
              de administrador.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <BotaoLink href="/">Voltar para a vitrine</BotaoLink>
            <Botao
              variante="secundario"
              onClick={() => void sair()}
            >
              Entrar com outra conta
            </Botao>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
