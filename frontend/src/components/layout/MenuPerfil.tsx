"use client";

import { Menu, Portal } from "@chakra-ui/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessao } from "@/hooks/useSessao";
import { AREA_POR_PAPEL } from "@/components/layout/areaPorPapel";
import { iniciais } from "@/lib/formato";

const ITEM =
  "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-raio px-3 text-apoio font-semibold text-tinta-2 data-highlighted:bg-superficie-2 data-highlighted:text-terracota";

// Botão de perfil do header: avatar, nome e menu da conta. Sem conta, vira o atalho para entrar.
export function MenuPerfil() {
  const router = useRouter();
  const { usuario, sair } = useSessao();

  if (!usuario) {
    return (
      <Link
        href="/entrar"
        className="inline-flex min-h-10 items-center gap-2 rounded-raio px-3 text-apoio font-semibold text-tinta transition-colors duration-150 hover:bg-superficie-2"
      >
        <User className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Entrar</span>
        <span className="sr-only sm:hidden">Entrar na conta</span>
      </Link>
    );
  }

  const primeiroNome = usuario.nome.split(" ")[0];
  const area = AREA_POR_PAPEL[usuario.papel];

  return (
    // unstyled: o visual vem só dos tokens via Tailwind, sem o tema do Chakra por cima.
    <Menu.Root unstyled positioning={{ placement: "bottom-end", gutter: 8 }}>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label={`Abrir menu da conta de ${primeiroNome}`}
          className="group inline-flex min-h-10 items-center gap-2 rounded-raio py-1 pl-1 pr-2 text-left transition-colors duration-150 hover:bg-superficie-2"
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-terracota text-legenda font-bold text-white"
          >
            {iniciais(usuario.nome)}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-apoio font-bold text-tinta">{primeiroNome}</span>
            <span className="text-legenda text-tinta-3">Meu perfil</span>
          </span>
          <ChevronDown
            className="hidden size-4 text-tinta-3 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none sm:block"
            aria-hidden="true"
          />
        </button>
      </Menu.Trigger>
      <Portal>
        {/* O Chakra põe z-index: auto inline; o ! garante o menu acima do header fixo. */}
        <Menu.Positioner className="z-50!">
          <Menu.Content className="w-60 rounded-raio border border-borda bg-superficie p-2 shadow-card outline-none!">
            <div className="border-b border-borda px-3 pb-3 pt-2">
              <p className="text-legenda text-tinta-3">Conta conectada</p>
              <p className="font-titulo text-h3 font-bold text-tinta">{usuario.nome}</p>
            </div>
            <div className="flex flex-col gap-1 pt-2">
              <Menu.Item value="area" asChild>
                <Link href={area.href} className={ITEM}>
                  <area.Icone className="size-4" aria-hidden="true" />
                  {area.nome}
                </Link>
              </Menu.Item>
              <Menu.Item
                value="sair"
                className={ITEM}
                onSelect={() => {
                  void sair().then(() => router.push("/"));
                }}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sair da conta
              </Menu.Item>
            </div>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
