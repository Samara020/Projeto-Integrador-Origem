import Image from "next/image";
import Link from "next/link";
import { BotaoCarrinho } from "@/components/produto/BotaoCarrinho";
import { BotaoCompararCard } from "@/components/produto/BotaoCompararCard";
import { Selo } from "@/components/ui/Selo";
import { formatarMoeda } from "@/lib/formato";
import type { ProdutoResumo } from "@/types";

const ROTULO_INDISPONIVEL = {
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
} as const;

// motivo: justificativa da recomendação (HU-17), mostrada acima do nome.
export function ProdutoCard({
  produto,
  motivo,
}: {
  produto: ProdutoResumo;
  motivo?: string;
}) {
  const indisponivel =
    produto.disponibilidade !== "DISPONIVEL"
      ? ROTULO_INDISPONIVEL[produto.disponibilidade]
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-raio border border-superficie-2 bg-superficie shadow-card">
      <div className="relative aspect-3/2 w-full overflow-hidden bg-superficie-2">
        <Image
          src={produto.imagemPrincipal}
          alt={produto.nome}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={`object-cover ${indisponivel ? "opacity-60" : ""}`}
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {produto.seloAtivo && <Selo variante="autentico">Autêntico</Selo>}
          {indisponivel && <Selo>{indisponivel}</Selo>}
        </div>
        <div className="absolute right-2 top-2">
          <BotaoCompararCard produtoId={produto.id} nome={produto.nome} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {motivo && (
          <p className="text-legenda font-bold text-terracota">{motivo}</p>
        )}
        <h3 className="font-titulo text-h3 font-bold text-tinta">
          <Link
            href={`/produto/${produto.id}`}
            className="after:absolute after:inset-0 group-hover:underline"
          >
            {produto.nome}
          </Link>
        </h3>
        <p className="text-legenda text-tinta-3">
          {produto.artesao.nome} · {produto.regiao.nome}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-corpo font-bold tabular-nums text-tinta">
            {formatarMoeda(produto.preco)}
          </p>
          <BotaoCarrinho produto={produto} />
        </div>
      </div>
    </article>
  );
}
