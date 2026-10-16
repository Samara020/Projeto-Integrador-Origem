import type { ReactNode } from "react";

export function TituloSecao({
  sobretitulo,
  titulo,
  descricao,
  acoes,
}: {
  sobretitulo: string;
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs tracking-wide text-terracota uppercase">{sobretitulo}</p>
        <h1 className="mt-2 font-lora text-3xl text-tinta">{titulo}</h1>
        {descricao ? <p className="mt-2 max-w-2xl text-sm text-tinta-2">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
    </div>
  );
}

export function Cartao({
  titulo,
  descricao,
  acoes,
  children,
  className = "",
}: {
  titulo?: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-borda bg-superficie p-5 ${className}`}>
      {titulo ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-lora text-lg text-tinta">{titulo}</h2>
            {descricao ? <p className="mt-1 text-sm text-tinta-2">{descricao}</p> : null}
          </div>
          {acoes}
        </div>
      ) : null}
      {children}
    </section>
  );
}
