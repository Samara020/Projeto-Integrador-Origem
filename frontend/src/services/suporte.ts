// Suporte (HU-22) e triagem inteligente (HU-23), simulados no navegador.
// Avaliação 2: abrir() e listar() viram POST e GET /suporte/tickets; a triagem vira o módulo de IA.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError } from "@/lib/http";
import type { ArtigoAjuda, CategoriaSuporte, MensagemTicket, NovoTicket, StatusTicket, Ticket } from "@/types";

const CHAVE = "tickets";
const ATRASO_MS = 700;

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

type Regra = { chaves: string[]; categoria: CategoriaSuporte; resposta: string; sugestoes: string[] };

const REGRAS: Regra[] = [
  { chaves: ["rastre", "onde est", "não chegou", "nao chegou", "chegou", "correio", "transportadora", "atras", "prazo", "entrega"], categoria: "rastreio", resposta: "Entendi. Vou verificar o trajeto: as peças saem do ateliê em até 3 dias úteis e o envio econômico leva de 7 a 10 dias úteis. O rastreio aparece em Compras realizadas quando o artesão despacha. Me diga o número do pedido que eu confiro a etapa atual.", sugestoes: ["Meu pedido passou do prazo", "Onde vejo o rastreio?"] },
  { chaves: ["troca", "devolu", "defeito", "quebr", "danific", "rachad", "reembolso", "diferente"], categoria: "troca", resposta: "Peça que chega danificada ou diferente da foto tem troca ou reembolso em até 7 dias após a entrega. Descreva o que aconteceu, com o número do pedido, que eu abro o processo com o artesão.", sugestoes: ["Quero reembolso", "Quero outra peça igual"] },
  { chaves: ["pagamento", "pix", "cartão", "cartao", "boleto", "cobran", "recusad", "pagar", "estorno", "duplicad"], categoria: "pagamento", resposta: "Pix confirma em segundos; cartão pode levar alguns minutos. Se o pedido ficou como Aguardando pagamento, use Pagar de novo na página do pedido. Cobrança duplicada é estornada em até 5 dias úteis.", sugestoes: ["Fui cobrado duas vezes", "Meu Pix não confirmou"] },
  { chaves: ["peça", "peca", "produto", "tamanho", "medida", "material", "personaliz", "encomenda", "autentic", "selo", "artesão", "artesao"], categoria: "produto", resposta: "Sobre a peça: as medidas e o material ficam na descrição, e o selo Autêntico aparece quando a equipe validou a origem com o artesão. Peças sob encomenda aceitam personalização pela própria página. Qual peça você quer saber mais?", sugestoes: ["Quais peças aceitam personalização?", "Como a validação é feita?"] },
  { chaves: ["problema", "pedido", "cancel", "errad", "faltou"], categoria: "pedido", resposta: "Vamos resolver. Me diga o número do pedido e o que saiu diferente do combinado: item errado, faltando ou cancelamento. Com isso eu direciono para o artesão ou para a equipe.", sugestoes: ["Quero cancelar o pedido", "Veio um item errado"] },
  { chaves: ["conta", "senha", "login", "entrar", "cadastro", "e-mail", "email"], categoria: "conta", resposta: "Para trocar a senha use Esqueci minha senha na tela de entrada. Para mudar o e-mail da conta, me diga o endereço novo que eu encaminho para a equipe confirmar.", sugestoes: ["Quero mudar meu e-mail"] },
];

const PEDE_HUMANO = /humano|atendente|pessoa|especialista|gente de verdade|falar com algu|n[aã]o resolveu|quero falar/i;
const SEM_REGRA = "Não encontrei isso nas minhas respostas. Pode contar com outras palavras, ou dizer o número do pedido? Se preferir, chamo alguém da equipe para assumir a conversa.";
const APROFUNDAR = "Já te passei o que sei sobre isso. Para ir além, me diga o número do pedido ou o que aconteceu de diferente, ou peça para falar com uma pessoa: ela recebe tudo o que você já escreveu.";
const TRANSICAO = "Conectando você a um especialista";

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function achar(texto: string): Regra | undefined {
  const alvo = semAcento(texto);
  return REGRAS.find((r) => r.chaves.some((chave) => alvo.includes(semAcento(chave))));
}
let contador = 0;
function mensagem(autor: MensagemTicket["autor"], texto: string, extra: Partial<MensagemTicket> = {}): MensagemTicket {
  contador += 1;
  return { id: `msg_${Date.now()}_${contador}`, autor, texto, criadoEm: new Date().toISOString(), ...extra };
}
function esperar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ATRASO_MS));
}
function ler(): Ticket[] {
  return lerLocal<Ticket[]>(CHAVE) ?? [];
}
function salvar(ticket: Ticket): Ticket {
  gravarLocal(CHAVE, [ticket, ...ler().filter((t) => t.ticketId !== ticket.ticketId)]);
  return ticket;
}

// Triagem inteligente (HU-23): regra por palavra-chave. Escala quando o comprador pede ou quando erra duas vezes.
function triar(ticket: Ticket, texto: string): { resposta: MensagemTicket; status: StatusTicket } {
  const regra = achar(texto);
  const semRespostaAntes = ticket.mensagens.filter((m) => m.autor === "IA" && m.texto === SEM_REGRA).length;
  const doComprador = ticket.mensagens.filter((m) => m.autor === "COMPRADOR").length;
  if (PEDE_HUMANO.test(texto) || (!regra && semRespostaAntes >= 1) || doComprador >= 5) {
    return { resposta: mensagem("IA", TRANSICAO), status: "ESCALADO_HUMANO" };
  }
  if (!regra) return { resposta: mensagem("IA", SEM_REGRA, { sugestoes: ["Falar com uma pessoa"] }), status: "TRIAGEM_INTELIGENTE" };
  const ultimaDaIa = [...ticket.mensagens].reverse().find((m) => m.autor === "IA");
  if (ultimaDaIa?.texto === regra.resposta) {
    return { resposta: mensagem("IA", APROFUNDAR, { categoria: regra.categoria, sugestoes: ["Falar com uma pessoa"] }), status: "ABERTO" };
  }
  return { resposta: mensagem("IA", regra.resposta, { categoria: regra.categoria, sugestoes: [...regra.sugestoes, "Falar com uma pessoa"] }), status: "ABERTO" };
}

function atendenteAssume(ticket: Ticket): MensagemTicket {
  const pedido = ticket.pedidoId ? ` e vou falar com a transportadora sobre o pedido ${ticket.pedidoId}` : "";
  return mensagem("ATENDENTE", `Olá! Sou o ${ATENDENTE}. Já vi o histórico${pedido}. Pode continuar por aqui.`);
}

export const suporteService = {
  // GET /suporte/tickets
  async listar(): Promise<Ticket[]> {
    return ler();
  },
  async buscar(ticketId: string): Promise<Ticket> {
    const ticket = ler().find((t) => t.ticketId === ticketId);
    if (!ticket) throw new ApiError(404, "Não encontramos esse chamado.");
    return ticket;
  },
  // POST /suporte/tickets: abre o chamado e a Jurema responde na hora.
  async abrir(novo: NovoTicket): Promise<Ticket> {
    await esperar();
    if (novo.assunto.trim().length < 3) throw new ApiError(400, "Diga o assunto em poucas palavras.");
    if (novo.mensagem.trim().length < 5) throw new ApiError(400, "Conte um pouco mais do que aconteceu.");
    const ticket: Ticket = {
      ticketId: `RG-${Date.now().toString().slice(-4)}`,
      assunto: novo.assunto.trim(),
      status: "TRIAGEM_INTELIGENTE",
      criadoEm: new Date().toISOString(),
      pedidoId: novo.pedidoId || undefined,
      prioridade: novo.prioridade ?? "NORMAL",
      mensagens: [mensagem("IA", BOAS_VINDAS, { sugestoes: ATALHOS }), mensagem("COMPRADOR", novo.mensagem.trim())],
    };
    const { resposta, status } = triar(ticket, `${novo.assunto} ${novo.mensagem}`);
    ticket.categoria = resposta.categoria;
    ticket.mensagens.push(resposta);
    ticket.status = status;
    if (status === "ESCALADO_HUMANO") ticket.mensagens.push(atendenteAssume(ticket));
    return salvar(ticket);
  },
  // POST /suporte/tickets/{id}/mensagens (lacuna do contrato)
  async responder(ticketId: string, texto: string): Promise<Ticket> {
    await esperar();
    const ticket = await this.buscar(ticketId);
    if (!texto.trim()) throw new ApiError(400, "Escreva a mensagem.");
    if (ticket.status === "RESOLVIDO") throw new ApiError(400, "Este chamado já foi encerrado. Abra outro se precisar.");
    ticket.mensagens.push(mensagem("COMPRADOR", texto.trim()));
    if (ticket.status === "ESCALADO_HUMANO") {
      ticket.mensagens.push(mensagem("ATENDENTE", "Anotado. Vou verificar e volto por aqui ainda hoje. Se quiser, mande fotos ou o número do pedido."));
    } else {
      const { resposta, status } = triar(ticket, texto);
      ticket.categoria = resposta.categoria ?? ticket.categoria;
      ticket.mensagens.push(resposta);
      ticket.status = status;
      if (status === "ESCALADO_HUMANO") ticket.mensagens.push(atendenteAssume(ticket));
    }
    return salvar(ticket);
  },
  async escalar(ticketId: string): Promise<Ticket> {
    await esperar();
    const ticket = await this.buscar(ticketId);
    if (ticket.status === "ESCALADO_HUMANO") return ticket;
    ticket.status = "ESCALADO_HUMANO";
    ticket.mensagens.push(mensagem("IA", TRANSICAO), atendenteAssume(ticket));
    return salvar(ticket);
  },
  // Volta para a assistente. O histórico com o atendente fica.
  async voltarParaAssistente(ticketId: string): Promise<Ticket> {
    await esperar();
    const ticket = await this.buscar(ticketId);
    ticket.status = "ABERTO";
    ticket.mensagens.push(mensagem("IA", "Voltei. O que mais posso ajudar?", { sugestoes: ATALHOS }));
    return salvar(ticket);
  },
  async resolver(ticketId: string): Promise<Ticket> {
    await esperar();
    const ticket = await this.buscar(ticketId);
    ticket.status = "RESOLVIDO";
    return salvar(ticket);
  },
};
