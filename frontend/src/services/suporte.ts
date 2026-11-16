import { http } from "@/lib/http";
import type { ArtigoAjuda, CategoriaSuporte, NovoTicket, Ticket, TicketCriado } from "@/types";

export const ASSISTENTE = "Jurema";
export const ATENDENTE = "Caio";
export const BOAS_VINDAS =
  "Boas-vindas à Origem! Posso ajudar com rastreio, dúvidas sobre uma peça ou problemas com pedido. O que aconteceu?";
export const ATALHOS = ["Onde está meu pedido?", "Quero saber sobre uma peça", "Tive um problema"];

export const CATEGORIAS_SUPORTE: { id: CategoriaSuporte; nome: string }[] = [
  { id: "rastreio", nome: "Rastreio" },
  { id: "pedido", nome: "Pedidos" },
  { id: "pagamento", nome: "Pagamentos" },
  { id: "troca", nome: "Envio e trocas" },
  { id: "produto", nome: "Peças e artesãos" },
  { id: "conta", nome: "Conta" },
];

// Conteúdo editorial da central. Vai para um endpoint quando a equipe de suporte assumir.
export const ARTIGOS_AJUDA: ArtigoAjuda[] = [
  { id: "acompanhar", categoria: "pedido", popular: true, titulo: "Como acompanhar meu pedido?", resumo: "Em Compras realizadas, cada pedido mostra o status: aguardando pagamento, pago, em entrega ou entregue. Você recebe um e-mail a cada mudança." },
  { id: "pagamentos", categoria: "pagamento", popular: true, titulo: "Quais formas de pagamento são aceitas?", resumo: "Pix, cartão de crédito e boleto. Pix confirma em segundos; boleto leva até 2 dias úteis para compensar." },
  { id: "direto", categoria: "produto", popular: true, titulo: "Como comprar diretamente de um artesão?", resumo: "Toda peça da Origem é vendida por quem fez. Na página da peça, o nome do ateliê leva à loja do artesão, com a história e as outras peças." },
  { id: "trocas", categoria: "troca", popular: true, titulo: "Trocas e devoluções de peças únicas", resumo: "Peça única que chega danificada tem reembolso ou reparo pelo artesão em até 7 dias. Por arrependimento, a devolução vale se a peça voltar intacta." },
  { id: "prazos", categoria: "troca", popular: true, titulo: "Prazos de produção artesanal", resumo: "Pronta entrega sai em até 3 dias úteis. Sob encomenda, o artesão confirma o prazo antes de começar; a média é de 20 dias." },
  { id: "rastreio", categoria: "rastreio", popular: false, titulo: "O código de rastreio não atualiza", resumo: "Os Correios podem levar 48 horas para registrar a primeira etapa. Passado isso, abra um chamado que a equipe fala com a transportadora." },
  { id: "pix", categoria: "pagamento", popular: false, titulo: "Paguei por Pix e o pedido continua aguardando", resumo: "Se passou de 10 minutos, abra o pedido e use Pagar de novo. Cobrança duplicada é estornada em até 5 dias úteis." },
  { id: "selo", categoria: "produto", popular: false, titulo: "O que é o selo Autêntico?", resumo: "A equipe validou a origem com o artesão: técnica, região e fotos do processo. Peça sem selo está em validação, não é falsa." },
  { id: "senha", categoria: "conta", popular: false, titulo: "Esqueci minha senha", resumo: "Na tela de entrada, use Esqueci minha senha. O link chega por e-mail e vale por 1 hora." },
];

export const suporteService = {
  async listar(): Promise<Ticket[]> {
    const resposta = await http<{ tickets: Ticket[] }>("/suporte/tickets");
    return resposta.tickets;
  },
  buscar: (id: string) => http<Ticket>(`/suporte/tickets/${encodeURIComponent(id)}`),
  async abrir(corpo: NovoTicket): Promise<Ticket> {
    const criado = await http<TicketCriado>("/suporte/tickets", { metodo: "POST", corpo });
    return this.buscar(criado.ticketId);
  },
  responder: (id: string, texto: string) => http<Ticket>(`/suporte/tickets/${encodeURIComponent(id)}/mensagens`, { metodo: "POST", corpo: { texto } }),
  escalar: (id: string) => http<Ticket>(`/suporte/tickets/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo: { status: "ESCALADO_HUMANO" } }),
  voltarParaAssistente: (id: string) => http<Ticket>(`/suporte/tickets/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo: { status: "ABERTO" } }),
  resolver: (id: string) => http<Ticket>(`/suporte/tickets/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo: { status: "RESOLVIDO" } }),
};
