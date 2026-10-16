import type { ReactNode } from "react";

type Variante =
  "autentico" | "neutro" | "destaque" | "sucesso" | "aviso" | "erro";

const VARIANTES: Record<Variante, string> = {
  autentico: "bg-selo text-superficie",
  neutro: "bg-superficie-2 text-tinta-2",
  destaque: "bg-terracota/10 text-terracota",
  sucesso: "bg-selo/10 text-selo",
  aviso: "bg-aviso text-superficie",
  erro: "bg-terracota text-superficie",
};

export function Selo({
  variante = "neutro",
  children,
}: {
  variante?: Variante;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-legenda font-bold uppercase tracking-wide ${VARIANTES[variante]}`}
    >
      {variante === "autentico" && (
        <span
          className="size-1.5 rounded-full bg-selo-ponto"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
