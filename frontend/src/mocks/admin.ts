import type { MetricasAdmin } from "@/types";

export const metricasAdmin: MetricasAdmin = {
  totalUsuarios: 350,
  totalArtesaos: 45,
  volumeTransacionadoGlobal: 28450,
  totalVendas: 482640,
  variacaoVendas: 14.2,
  totalArtesaosAtivos: 1284,
  novosArtesaosNoMes: 38,
  totalProdutos: 8946,
  novosProdutos: 312,
  ticketsSuporte: 27,
  ticketsUrgentes: 8,
  validacoesPendentes: 16,
  vendasPorRegiao: [
    { sigla: "CE", percentual: 51 },
    { sigla: "PE", percentual: 79 },
    { sigla: "BA", percentual: 66 },
    { sigla: "AL", percentual: 99 },
    { sigla: "PB", percentual: 86 },
  ],
  categoriasMaisVendidas: [
    { nome: "Cerâmica", percentual: 34 },
    { nome: "Bordado", percentual: 27 },
    { nome: "Madeira", percentual: 21 },
    { nome: "Literatura", percentual: 18 },
  ],
  denunciasPendentes: 5,
  usuariosRecentes: [
    { nome: "Joana Melo", papel: "Compradora" },
    { nome: "Mestre Naldo", papel: "Artesão" },
  ],
  atividadesRecentes: [
    '09:42 Produto "Moringa do Sol" aprovado',
    "09:18 Perfil de Cida Barro validado",
    "08:55 Ticket #284 respondido",
  ],
};
