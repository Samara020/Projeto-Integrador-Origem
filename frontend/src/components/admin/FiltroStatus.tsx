import { formatarInteiro } from "@/lib/formato";

type OpcaoFiltro = { id: string; nome: string; total: number };

// Chips de status das filas do administrador (validação e moderação).
// O id "" é o filtro padrão da tela; o pai decide o que ele significa.
export function FiltroStatus({
  opcoes,
  ativo,
  aoEscolher,
}: {
  opcoes: OpcaoFiltro[];
  ativo: string;
  aoEscolher: (id: string) => void;
}) {
  return (
    <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const selecionado = opcao.id === ativo;
        return (
          <button
            key={opcao.id || "padrao"}
            type="button"
            aria-pressed={selecionado}
            onClick={() => aoEscolher(opcao.id)}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-apoio font-bold tabular-nums transition-colors duration-150 ${
              selecionado
                ? "bg-terracota text-white"
                : "border border-borda-forte text-tinta-2 hover:border-tinta-3 hover:text-tinta"
            }`}
          >
            {opcao.nome} ({formatarInteiro(opcao.total)})
          </button>
        );
      })}
    </div>
  );
}
