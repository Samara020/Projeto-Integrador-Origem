import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { formatarMoeda } from "@/lib/formato";

export function ResumoPedido({
  subtotal,
  frete,
  total,
  acao,
}: {
  subtotal: number;
  frete: number | null;
  total: number | null;
  acao: ReactNode;
}) {
  return (
    <aside
      aria-labelledby="resumo-pedido-titulo"
      className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-5 shadow-card lg:sticky lg:top-24"
    >
      <h2
        id="resumo-pedido-titulo"
        className="font-titulo text-h2 font-bold text-tinta"
      >
        Resumo do pedido
      </h2>

      <dl className="flex flex-col gap-3 text-apoio tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-tinta-2">Subtotal</dt>
          <dd className="font-semibold text-tinta">{formatarMoeda(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-tinta-2">Frete</dt>
          <dd className="font-semibold text-tinta">
            {frete === null ? "A calcular" : formatarMoeda(frete)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-borda pt-3 font-bold text-tinta">
          <dt>Total</dt>
          <dd>{total === null ? "A calcular" : formatarMoeda(total)}</dd>
        </div>
      </dl>

      {acao}

      <p className="flex items-center justify-center gap-2 text-legenda text-selo">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Compra protegida pela Origem
      </p>
    </aside>
  );
}
