import type { StatusTicket as Status } from "@/types";

export const ROTULOS_STATUS: Record<Status, string> = {
  TRIAGEM_INTELIGENTE: "Em análise",
  ABERTO: "Em análise",
  ESCALADO_HUMANO: "Com especialista",
  RESOLVIDO: "Respondido",
};

const CORES: Record<Status, string> = {
  TRIAGEM_INTELIGENTE: "text-aviso",
  ABERTO: "text-aviso",
  ESCALADO_HUMANO: "text-info",
  RESOLVIDO: "text-selo",
};

// Linha de status do Figma: ponto colorido + rótulo + tempo.
export function StatusTicket({ status, complemento }: { status: Status; complemento?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-legenda ${CORES[status]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {ROTULOS_STATUS[status]}
      {complemento && <span className="text-tinta-3"> · {complemento}</span>}
    </span>
  );
}
