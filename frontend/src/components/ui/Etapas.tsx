export function Etapas({
  rotulo,
  etapas,
  atual,
}: {
  rotulo: string;
  etapas: string[];
  atual: number;
}) {
  return (
    <ol
      aria-label={rotulo}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
    >
      {etapas.map((nome, indice) => {
        const numero = indice + 1;
        const concluida = numero <= atual;
        const ativa = numero === atual;
        const alinhamento =
          indice === 0
            ? "items-start"
            : indice === etapas.length - 1
              ? "items-end"
              : "items-center";

        return (
          <li key={nome} className={`flex min-w-0 flex-col gap-2 ${alinhamento}`}>
            <span
              className={`inline-flex size-6 items-center justify-center rounded-full border text-legenda tabular-nums ${
                concluida
                  ? "border-terracota bg-terracota text-white"
                  : "border-borda bg-superficie text-tinta-3"
              }`}
              aria-current={ativa ? "step" : undefined}
            >
              {numero}
            </span>
            <span
              className={`truncate text-legenda sm:text-apoio ${
                ativa ? "font-bold text-tinta" : "text-tinta-3"
              }`}
            >
              {nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
