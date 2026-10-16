// Dados da Fake API do painel do artesão. Só src/app/api importa daqui.
// A artesã de demonstração é a usr_901, a mesma que aparece na loja pública.

import type {
  ConfiguracoesEnvio,
  CotacaoFrete,
  MetricasArtesao,
  PecaEstoque,
  PedidoRecebido,
  PerfilArtesaoEdicao,
} from "@/types";

export const metricasArtesao: MetricasArtesao = {
  vendasMes: 8420,
  variacaoVendas: 18,
  pedidosPendentes: 12,
  pedidosNovos: 3,
  avaliacaoMedia: 4.8,
  totalAvaliacoes: 126,
  visualizacoes: 2846,
  variacaoVisualizacoes: 24,
  produtosAtivos: 4,
  vendasPorDia: [
    { dia: "2026-09-01", valor: 310 },
    { dia: "2026-09-03", valor: 240 },
    { dia: "2026-09-05", valor: 420 },
    { dia: "2026-09-07", valor: 180 },
    { dia: "2026-09-09", valor: 380 },
    { dia: "2026-09-11", valor: 520 },
    { dia: "2026-09-13", valor: 260 },
    { dia: "2026-09-15", valor: 440 },
    { dia: "2026-09-17", valor: 610 },
    { dia: "2026-09-19", valor: 330 },
    { dia: "2026-09-21", valor: 480 },
    { dia: "2026-09-23", valor: 570 },
  ],
  alertas: [
    {
      id: "estoque-baixo",
      quantidade: 3,
      mensagem: "3 peças com estoque baixo",
      acao: "Ver estoque",
      destino: "/painel/artesao/estoque",
    },
    {
      id: "validacao-pendente",
      quantidade: 2,
      mensagem: "2 peças com validação pendente",
      acao: "Revisar",
      destino: "/painel/artesao/estoque",
    },
  ],
  pedidosRecentes: [
    {
      id: "ped_1048",
      comprador: "Marina Costa",
      itens: "Luminária Mandacaru × 1",
      valorTotal: 145,
      statusProducao: "NOVO",
    },
    {
      id: "ped_1047",
      comprador: "Pedro Lima",
      itens: "Jogo de Cerâmica × 2",
      valorTotal: 248,
      statusProducao: "EM_PRODUCAO",
    },
  ],
};

export const pecasEstoque: PecaEstoque[] = [
  {
    id: "prd_202",
    nome: "Luminária Mandacaru",
    sku: "ORG-LUM-014",
    imagemPrincipal: "/produtos/luminaria-barro.jpg",
    estoque: 8,
    situacao: "ATIVO",
  },
  {
    id: "prd_301",
    nome: "Vaso Renda do Sertão",
    sku: "ORG-VAS-021",
    imagemPrincipal: "/produtos/vaso-ceramica.jpg",
    estoque: 2,
    situacao: "ESTOQUE_BAIXO",
  },
  {
    id: "prd_302",
    nome: "Jogo de Xícaras Cariri",
    sku: "ORG-XIC-008",
    imagemPrincipal: "/produtos/vaso-ceramica.jpg",
    estoque: 0,
    situacao: "ESGOTADO",
  },
  {
    id: "prd_303",
    nome: "Escultura Asa Branca",
    sku: "ORG-ESC-006",
    imagemPrincipal: "/produtos/passaro-madeira.jpg",
    estoque: 1,
    situacao: "INATIVO",
  },
];

export const pedidosRecebidos: PedidoRecebido[] = [
  {
    id: "ped_1048",
    criadoEm: "2026-09-11T12:40:00Z",
    statusProducao: "NOVO",
    comprador: { nome: "Marina Costa", local: "Recife, PE" },
    itens: [
      {
        produtoId: "prd_202",
        nome: "Luminária Mandacaru",
        quantidade: 1,
        precoUnitario: 145,
      },
    ],
    valorTotal: 145,
    proximaAcao: "ACEITAR",
    codigoRastreio: null,
  },
  {
    id: "ped_1042",
    criadoEm: "2026-09-09T09:10:00Z",
    statusProducao: "EM_PRODUCAO",
    comprador: { nome: "João Mendes", local: "Salvador, BA" },
    itens: [
      {
        produtoId: "prd_301",
        nome: "Vaso Renda do Sertão",
        quantidade: 2,
        precoUnitario: 120,
      },
    ],
    valorTotal: 240,
    proximaAcao: "MARCAR_PRONTO",
    codigoRastreio: null,
  },
  {
    id: "ped_1036",
    criadoEm: "2026-09-06T15:25:00Z",
    statusProducao: "PRONTO",
    comprador: { nome: "Lia Santos", local: "São Paulo, SP" },
    itens: [
      {
        produtoId: "prd_303",
        nome: "Escultura Asa Branca",
        quantidade: 1,
        precoUnitario: 310,
      },
    ],
    valorTotal: 310,
    proximaAcao: "INFORMAR_RASTREIO",
    codigoRastreio: null,
  },
  {
    id: "ped_1029",
    criadoEm: "2026-09-02T11:05:00Z",
    statusProducao: "ENVIADO",
    comprador: { nome: "Caio Nunes", local: "Brasília, DF" },
    itens: [
      {
        produtoId: "prd_302",
        nome: "Jogo de Xícaras Cariri",
        quantidade: 1,
        precoUnitario: 198,
      },
    ],
    valorTotal: 198,
    proximaAcao: "VER_RASTREIO",
    codigoRastreio: "BR458012973RG",
  },
];

export const perfilEdicao: PerfilArtesaoEdicao = {
  nomeArtistico: "Ana Pereira Cerâmica",
  regiao: "Caruaru, PE",
  biografia:
    "Minha cerâmica nasce do barro do Agreste e das memórias da minha família. Modelo, queimo no forno a lenha e assino cada peça no fundo.",
  tecnicas: ["Cerâmica", "Modelagem manual", "Pintura mineral"],
  foto: "/artesaos/ana-pereira.png",
  fotoCapa: "/artesaos/ana-xilogravura.jpg",
  contato: { telefone: "(81) 99999-2210", redesSociais: "@anapereiraceramica" },
  certificacoes: ["Selo Artesanato de Pernambuco"],
  dadosBancarios: "Banco 260 · Ag. 0001 · •••• 4821",
};

export const configuracoesEnvio: ConfiguracoesEnvio = {
  opcoes: [
    {
      id: "economico",
      nome: "Origem Econômico",
      prazo: "6 a 8 dias úteis",
      ativa: true,
    },
    {
      id: "expresso",
      nome: "Origem Expresso",
      prazo: "2 a 4 dias úteis",
      ativa: true,
    },
    {
      id: "retirada",
      nome: "Retirada no ateliê",
      prazo: "Combinado com a artesã",
      ativa: true,
    },
  ],
  tiposEmbalagem: [
    { id: "caixa-papelao", nome: "Caixa de papelão reciclado" },
    { id: "envelope-kraft", nome: "Envelope kraft reforçado" },
    { id: "fibra-vegetal", nome: "Proteção de fibra vegetal" },
  ],
  prazosPorRegiao: [
    { regiao: "Nordeste", prazo: "3 a 5 dias" },
    { regiao: "Sudeste", prazo: "5 a 8 dias" },
    { regiao: "Sul", prazo: "6 a 9 dias" },
    { regiao: "Norte e Centro-Oeste", prazo: "7 a 12 dias" },
  ],
};

// Peso × 12,00 mais 4,00 de embalagem: é a conta que a transportadora usa na prévia.
// Peso mais volume estimado: é o que a transportadora cobra de verdade.
export function cotarFrete(pesoKg: number, volumeCm3 = 0): CotacaoFrete {
  const volume = (volumeCm3 / 5000) * 3.5;
  const valor = Math.round((pesoKg * 14 + volume + 8) * 100) / 100;
  return {
    servico: {
      id: "economico",
      nome: "Origem Econômico",
      prazo: "6 a 8 dias úteis",
    },
    valor,
  };
}
