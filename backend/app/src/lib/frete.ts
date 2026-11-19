import { ErroApp } from "../middleware/error";

export type OpcaoFrete = {
  id: string;
  nome: string;
  prazo: string;
  valor: number;
  ativa: boolean;
};

export const OPCOES_FRETE: OpcaoFrete[] = [
  { id: "economico", nome: "Origem Econômico", prazo: "6 a 8 dias úteis", valor: 18, ativa: true },
  { id: "expresso", nome: "Origem Expresso", prazo: "2 a 3 dias úteis", valor: 34.9, ativa: true },
];

export const TIPOS_EMBALAGEM = [
  { id: "caixa-papelao", nome: "Caixa de papelão reciclado" },
  { id: "caixa-madeira", nome: "Caixa de madeira reutilizável" },
];

export const PRAZOS_POR_REGIAO = [
  { regiao: "Nordeste", prazo: "3 a 5 dias" },
  { regiao: "Sudeste", prazo: "5 a 7 dias" },
  { regiao: "Norte", prazo: "7 a 10 dias" },
];

export function configuracaoPadrao() {
  return {
    opcoes: OPCOES_FRETE.map((opcao) => ({ ...opcao })),
    tiposEmbalagem: TIPOS_EMBALAGEM.map((item) => ({ ...item })),
    prazosPorRegiao: PRAZOS_POR_REGIAO.map((item) => ({ ...item })),
  };
}

export function opcaoPorId(id?: string): OpcaoFrete {
  const opcao = OPCOES_FRETE.find((item) => item.id === (id ?? "economico"));
  if (!opcao || !opcao.ativa) {
    throw new ErroApp(400, "Opção de envio indisponível.");
  }
  return opcao;
}
