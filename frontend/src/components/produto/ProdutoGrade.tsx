import { ProdutoCard } from "@/components/produto/ProdutoCard";
import { Esqueleto } from "@/components/ui/Esqueleto";
import type { ProdutoSugerido } from "@/types";

const GRADE = "grid grid-cols-2 gap-4 md:grid-cols-3";

// "catalogo" divide a largura com a coluna de filtros, então só chega a 4 em telas largas.
const COLUNAS = {
  vitrine: `${GRADE} lg:grid-cols-4`,
  catalogo: `${GRADE} xl:grid-cols-4`,
} as const;

type Colunas = keyof typeof COLUNAS;

export function ProdutoGrade({
  produtos,
  colunas = "vitrine",
}: {
  produtos: ProdutoSugerido[];
  colunas?: Colunas;
}) {
  return (
    <ul className={COLUNAS[colunas]}>
      {produtos.map((produto) => (
        <li key={produto.id}>
          <ProdutoCard produto={produto} motivo={produto.motivo} />
        </li>
      ))}
    </ul>
  );
}

export function ProdutoGradeEsqueleto({
  quantidade = 4,
  colunas = "vitrine",
}: {
  quantidade?: number;
  colunas?: Colunas;
}) {
  return (
    <div className={COLUNAS[colunas]} role="status" aria-label="Carregando peças">
      {Array.from({ length: quantidade }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-raio border border-superficie-2 bg-superficie"
        >
          <Esqueleto className="aspect-3/2 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Esqueleto className="h-5 w-3/4" />
            <Esqueleto className="h-3 w-1/2" />
            <Esqueleto className="mt-2 h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
