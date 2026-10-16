import { Etapas } from "@/components/ui/Etapas";

const ETAPAS = ["Endereço", "Envio", "Pagamento", "Revisão"];

export function EtapasCompra({ atual }: { atual: 2 | 3 | 4 }) {
  return <Etapas rotulo="Etapas da compra" etapas={ETAPAS} atual={atual} />;
}
