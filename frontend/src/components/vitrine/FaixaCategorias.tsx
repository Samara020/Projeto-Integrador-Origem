"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { iconeCategoria } from "@/components/layout/iconeCategoria";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCategorias } from "@/hooks/useCatalogo";

// Caminhos de descoberta: uma entrada por categoria, lado a lado a partir de sm.
export function FaixaCategorias() {
  const { dados, carregando, erro } = useCategorias();

  // Sem categorias a faixa some: o header e a busca seguem levando ao catálogo.
  if (erro || (dados && dados.length === 0)) return null;

  return (
    <nav aria-label="Comprar por categoria" className="border-b border-borda bg-superficie">
      <ul className="mx-auto grid w-full max-w-pagina sm:grid-cols-3">
        {carregando &&
          [0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-4 border-b border-borda px-margem py-5 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <Esqueleto className="size-10" />
              <Esqueleto className="h-5 w-32" />
            </li>
          ))}
        {dados?.map((categoria) => {
          const Icone = iconeCategoria(categoria.id);
          return (
            <li key={categoria.id} className="border-b border-borda last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <Link
                href={`/catalogo?categoria=${categoria.id}`}
                className="group flex items-center gap-4 px-margem py-5 transition-colors duration-150 hover:bg-fundo"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-raio bg-superficie-2 text-terracota">
                  <Icone className="size-5" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="font-titulo text-h3 font-bold text-tinta">{categoria.nome}</span>
                  <span className="text-legenda text-tinta-3">Ver peças no catálogo</span>
                </span>
                <ArrowRight className="ml-auto size-4 text-tinta-3 transition-colors duration-150 group-hover:text-terracota" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
