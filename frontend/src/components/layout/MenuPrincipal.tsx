"use client";

import { Drawer, Portal } from "@chakra-ui/react";
import {
  ArrowRight,
  CircleHelp,
  Heart,
  LogIn,
  LogOut,
  Menu,
  Package,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AREA_POR_PAPEL } from "@/components/layout/areaPorPapel";
import { iconeCategoria } from "@/components/layout/iconeCategoria";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCategorias } from "@/hooks/useCatalogo";
import { useComparacao } from "@/hooks/useComparacao";
import { useSessao } from "@/hooks/useSessao";

const GRUPO = "px-4 text-legenda font-semibold uppercase tracking-wide text-tinta-3";
const ITEM =
  "flex min-h-12 w-full items-center gap-3 rounded-raio px-4 text-left text-apoio font-semibold transition-colors duration-150";
const ITEM_ATIVO = "bg-superficie-2 font-bold text-terracota";
const ITEM_NORMAL = "text-tinta-2 hover:bg-superficie-2 hover:text-terracota";

function ItemMenu({
  href,
  ativo,
  recuado,
  Icone,
  fim,
  aoClicar,
  children,
}: {
  href: string;
  ativo?: boolean;
  recuado?: boolean;
  Icone?: LucideIcon;
  fim?: ReactNode;
  aoClicar: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={aoClicar}
      aria-current={ativo ? "page" : undefined}
      className={`${ITEM} ${recuado ? "pl-8" : ""} ${ativo ? ITEM_ATIVO : ITEM_NORMAL}`}
    >
      {Icone && <Icone className="size-5 shrink-0" aria-hidden="true" />}
      <span className="flex-1">{children}</span>
      {fim}
    </Link>
  );
}

// Menu hambúrguer: navegação, categorias recuadas e a conta no pé da gaveta.
export function MenuPrincipal() {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const categorias = useCategorias();
  const { ids } = useComparacao();
  const { usuario, sair } = useSessao();
  const fechar = () => setAberto(false);

  return (
    <Drawer.Root
      open={aberto}
      onOpenChange={(detalhe) => setAberto(detalhe.open)}
      placement="start"
    >
      <Drawer.Trigger asChild>
        <button
          type="button"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-raio border border-borda text-tinta transition-colors duration-150 hover:border-terracota hover:text-terracota"
          aria-label="Abrir menu principal"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <div className="flex w-full items-center justify-between gap-3">
                <Link href="/" onClick={fechar} aria-label="Origem, página inicial">
                  <Image
                    src="/marca/logo-origem.webp"
                    alt="Origem, cultura que conecta"
                    width={150}
                    height={62}
                    className="h-12 w-auto"
                  />
                </Link>
                <Drawer.CloseTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-raio border border-borda text-tinta transition-colors duration-150 hover:bg-superficie-2"
                    aria-label="Fechar menu"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </Drawer.CloseTrigger>
              </div>
            </Drawer.Header>

            <Drawer.Body>
              <nav aria-label="Navegação principal" className="flex flex-col gap-8 pt-4">
                <div className="flex flex-col gap-2">
                  <p className={GRUPO}>Navegação</p>
                  <ul className="flex flex-col gap-1">
                    <li>
                      <ItemMenu
                        href="/catalogo"
                        ativo={pathname === "/catalogo"}
                        aoClicar={fechar}
                        fim={<ArrowRight className="size-4" aria-hidden="true" />}
                      >
                        Todas as peças
                      </ItemMenu>
                    </li>
                    <li>
                      <ItemMenu
                        href="/recomendacoes"
                        ativo={pathname === "/recomendacoes"}
                        aoClicar={fechar}
                        fim={<Heart className="size-4" aria-hidden="true" />}
                      >
                        Para você
                      </ItemMenu>
                    </li>
                    <li>
                      <ItemMenu
                        href="/comparar"
                        ativo={pathname === "/comparar"}
                        aoClicar={fechar}
                        fim={
                          <span className="inline-flex min-w-6 justify-center rounded-full bg-superficie-2 px-2 text-legenda font-bold tabular-nums text-tinta-2">
                            {ids.length}
                          </span>
                        }
                      >
                        Comparar peças
                      </ItemMenu>
                    </li>
                    <li>
                      <ItemMenu
                        href="/conta"
                        ativo={pathname.startsWith("/conta")}
                        aoClicar={fechar}
                        fim={<Package className="size-4" aria-hidden="true" />}
                      >
                        Visualizar compras
                      </ItemMenu>
                    </li>
                  </ul>
                </div>

                {!categorias.erro && (
                  <div className="flex flex-col gap-2 border-t border-borda pt-6">
                    <p className={GRUPO}>Categorias</p>
                    <ul className="flex flex-col gap-1">
                      {categorias.carregando &&
                        [0, 1, 2].map((i) => (
                          <li key={i} className="py-2 pl-8">
                            <Esqueleto className="h-5 w-40" />
                          </li>
                        ))}
                      {categorias.dados?.map((categoria) => (
                        <li key={categoria.id}>
                          <ItemMenu
                            href={`/catalogo?categoria=${categoria.id}`}
                            recuado
                            Icone={iconeCategoria(categoria.id)}
                            aoClicar={fechar}
                          >
                            {categoria.nome}
                          </ItemMenu>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </nav>
            </Drawer.Body>

            <Drawer.Footer>
              <div className="flex w-full flex-col gap-1 border-t border-borda pt-4">
                <ItemMenu href="/suporte" Icone={CircleHelp} ativo={pathname.startsWith("/suporte")} aoClicar={fechar}>
                  Central de ajuda
                </ItemMenu>
                {/* Comprador já tem "Visualizar compras" na navegação. */}
                {usuario && usuario.papel !== "COMPRADOR" && (
                  <ItemMenu
                    href={AREA_POR_PAPEL[usuario.papel].href}
                    Icone={AREA_POR_PAPEL[usuario.papel].Icone}
                    ativo={pathname.startsWith(AREA_POR_PAPEL[usuario.papel].href)}
                    aoClicar={fechar}
                  >
                    {AREA_POR_PAPEL[usuario.papel].nome}
                  </ItemMenu>
                )}
                {usuario ? (
                  <button
                    type="button"
                    onClick={() => {
                      fechar();
                      void sair().then(() => router.push("/"));
                    }}
                    className={`${ITEM} ${ITEM_NORMAL}`}
                  >
                    <LogOut className="size-5 shrink-0" aria-hidden="true" />
                    Sair da conta
                  </button>
                ) : (
                  <ItemMenu href="/entrar" Icone={LogIn} aoClicar={fechar}>
                    Entrar
                  </ItemMenu>
                )}
              </div>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
