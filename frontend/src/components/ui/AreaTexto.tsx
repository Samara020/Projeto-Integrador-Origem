import type { ComponentProps } from "react";

type AreaTextoProps = Omit<ComponentProps<"textarea">, "id" | "className"> & {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function AreaTexto({ id, rotulo, erro, dica, ...resto }: AreaTextoProps) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-apoio font-bold text-tinta">
        {rotulo}
      </label>
      <textarea
        id={id}
        rows={4}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={`w-full rounded-raio border bg-superficie px-3 py-2 text-corpo text-tinta placeholder:text-tinta-4 ${
          erro ? "border-erro" : "border-borda hover:border-borda-forte"
        }`}
        {...resto}
      />
      <p id={descricao} className={`min-h-5 text-apoio ${erro ? "text-erro" : "text-tinta-3"}`}>
        {erro ?? dica}
      </p>
    </div>
  );
}
