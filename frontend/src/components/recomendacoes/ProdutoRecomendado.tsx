import Image from "next/image";
import Link from "next/link";
import { formatarMoeda } from "@/lib/formato";
import type { ProdutoResumo } from "@/types";

// Cartão largo do Figma: foto em faixa, motivo, nome, artesão e preço.
export function ProdutoRecomendado({ produto, motivo, tom = "terracota" }: { produto: ProdutoResumo; motivo: string; tom?: "terracota" | "selo" }) {
  return (
    <article className="group overflow-hidden rounded-raio border border-borda bg-superficie">
      <div className="relative h-26 w-full bg-superficie-2 sm:h-32">
        <Image src={produto.imagemPrincipal} alt="" fill sizes="(min-width: 1440px) 1344px, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-col gap-1 p-4">
        <p className={`text-legenda font-bold uppercase tracking-wide ${tom === "selo" ? "text-selo" : "text-terracota"}`}>{motivo}</p>
        <h3 className="font-titulo text-h3 font-bold text-tinta">
          <Link href={`/produto/${produto.id}`} className="after:absolute after:inset-0 group-hover:underline">{produto.nome}</Link>
        </h3>
        <p className="text-legenda text-tinta-3">{produto.artesao.nome} · {produto.regiao.nome}</p>
        <p className="text-apoio font-bold tabular-nums text-tinta">{formatarMoeda(produto.preco)}</p>
      </div>
    </article>
  );
}
