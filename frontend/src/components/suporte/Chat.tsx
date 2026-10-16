"use client";

import { ArrowRight, CircleAlert, Info, PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Container } from "@/components/layout/Container";
import { StatusTicket } from "@/components/suporte/StatusTicket";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useTicket } from "@/hooks/useSuporte";
import { tempoRelativo } from "@/lib/formato";
import { ApiError } from "@/lib/http";
import { ASSISTENTE, ATALHOS, ATENDENTE, BOAS_VINDAS, CATEGORIAS_SUPORTE } from "@/services/suporte";
import type { MensagemTicket, Ticket } from "@/types";

const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const TRANSICAO = "Conectando você a um especialista";
const ACOES = [
  { texto: "Rastrear uma encomenda", Icone: PackageSearch },
  { texto: "Tirar dúvida sobre uma peça", Icone: Info },
  { texto: "Resolver problema com pedido", Icone: CircleAlert },
];

function nomeCategoria(id?: string) {
  return CATEGORIAS_SUPORTE.find((c) => c.id === id)?.nome;
}

function Balao({ m, ultima, aoSugerir }: { m: MensagemTicket; ultima: boolean; aoSugerir: (t: string) => void }) {
  if (m.autor === "IA" && m.texto === TRANSICAO) {
    return (
      <li className="rounded-raio bg-areia px-4 py-3 text-center text-apoio font-bold text-terracota" aria-live="polite">
        {TRANSICAO}
      </li>
    );
  }
  const doComprador = m.autor === "COMPRADOR";
  const estilo = doComprador ? "self-end bg-info text-white" : m.autor === "ATENDENTE" ? "self-start border border-info/40 bg-info/15 text-tinta" : "self-start border border-superficie-2 bg-areia text-tinta";
  return (
    <li className={`flex max-w-[85%] flex-col gap-2 md:max-w-[60%] ${doComprador ? "self-end" : "self-start"}`}>
      <div className={`flex flex-col gap-1 rounded-raio px-4 py-3 ${estilo}`}>
        {m.categoria && m.autor === "IA" && (
          <p className="text-legenda font-bold uppercase tracking-wide text-terracota">Classificado como · {nomeCategoria(m.categoria)}</p>
        )}
        <p className="text-apoio">{m.texto}</p>
        {m.criadoEm && (
          <p className={`text-legenda ${doComprador ? "text-white/70" : "text-tinta-3"}`}>
            <time dateTime={m.criadoEm}>{hora.format(new Date(m.criadoEm))}</time>
          </p>
        )}
      </div>
      {ultima && m.sugestoes && m.sugestoes.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Respostas rápidas">
          {m.sugestoes.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => aoSugerir(s)} className="inline-flex min-h-9 items-center text-apoio text-terracota hover:underline">{s}</button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function PainelAssistente({ aoAtalho, ocupado }: { aoAtalho: (t: string) => void; ocupado: boolean }) {
  return (
    <aside className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link href="/suporte" className="text-apoio text-terracota hover:underline">Central de suporte</Link>
        <h1 className="font-titulo text-h1 font-bold text-tinta">Olá, eu sou a {ASSISTENTE}</h1>
        <p className="text-apoio text-tinta-2">A assistente virtual da Origem, feita para orientar sua jornada.</p>
      </div>
      <div className="flex flex-col gap-2 rounded-raio border border-superficie-2 bg-superficie p-4">
        <h2 className="font-titulo text-h3 font-bold text-tinta">Como posso ajudar?</h2>
        <ul className="flex flex-col">
          {ACOES.map(({ texto, Icone }) => (
            <li key={texto}>
              <button type="button" disabled={ocupado} onClick={() => aoAtalho(texto)} className="inline-flex min-h-10 items-center gap-2 text-apoio text-tinta hover:text-terracota disabled:opacity-60">
                <Icone className="size-4 text-terracota" aria-hidden="true" />
                {texto}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-legenda text-tinta-3">Sua conversa é usada somente para direcionar o atendimento.</p>
    </aside>
  );
}

function PainelEspecialista({ ticket, aoVoltar, ocupado }: { ticket: Ticket; aoVoltar: () => void; ocupado: boolean }) {
  return (
    <aside className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link href="/suporte" className="text-apoio text-terracota hover:underline">Central de suporte</Link>
        <h1 className="font-titulo text-h1 font-bold text-tinta">Uma pessoa vai cuidar disso</h1>
        <p className="text-apoio text-tinta-2">O contexto da conversa com a {ASSISTENTE} já foi compartilhado.</p>
      </div>
      <div className="flex flex-col gap-2 rounded-raio border border-superficie-2 bg-superficie p-4">
        <h2 className="font-titulo text-h3 font-bold text-tinta">Resumo do caso</h2>
        <p className="text-apoio font-medium text-selo">
          {nomeCategoria(ticket.categoria) ?? "Suporte"}{ticket.pedidoId ? ` · Pedido ${ticket.pedidoId}` : ` · Ticket #${ticket.ticketId}`}
        </p>
        <p className="text-apoio text-tinta-3">{ticket.assunto}. Aberto {tempoRelativo(ticket.criadoEm)}.</p>
      </div>
      <Botao onClick={aoVoltar} disabled={ocupado} className="self-start bg-info hover:bg-info/90">Voltar ao bot</Botao>
    </aside>
  );
}

export function Chat({ ticketId }: { ticketId: string | null }) {
  const router = useRouter();
  const { ticket, carregando, naoEncontrado, abrir, responder, escalar, voltarParaAssistente, resolver } = useTicket(ticketId ?? "");
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const nova = ticketId === null;
  const totalMensagens = ticket?.mensagens.length ?? 0;

  useEffect(() => {
    document.title = ticket ? `${ticket.assunto} · Suporte Origem` : `Conversa com ${ASSISTENTE} · Origem`;
  }, [ticket]);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "nearest" });
  }, [totalMensagens]);

  async function executar(acao: () => Promise<unknown>, padrao: string) {
    setOcupado(true);
    setFalha(null);
    try {
      await acao();
    } catch (causa) {
      setFalha(causa instanceof ApiError ? causa.message : padrao);
    } finally {
      setOcupado(false);
    }
  }

  function enviar(mensagem: string) {
    const limpo = mensagem.trim();
    if (!limpo) return;
    setTexto("");
    if (nova) {
      void executar(async () => {
        const criado = await abrir({ assunto: limpo.slice(0, 40), mensagem: limpo });
        router.replace(`/suporte/${criado.ticketId}`);
      }, "Não foi possível iniciar a conversa. Tente de novo.");
      return;
    }
    if (!ticket) return;
    if (limpo === "Falar com uma pessoa") {
      void executar(() => escalar(ticket.ticketId), "Não foi possível chamar a equipe. Tente de novo.");
      return;
    }
    void executar(() => responder(ticket.ticketId, limpo), "Não foi possível enviar. Tente de novo.");
  }

  if (!nova && carregando) {
    return (
      <Container className="py-secao">
        <div role="status" aria-label="Carregando conversa" className="grid gap-6 lg:grid-cols-[18rem_1fr]"><Esqueleto className="h-64" /><Esqueleto className="h-120" /></div>
      </Container>
    );
  }
  if (!nova && (naoEncontrado || !ticket)) {
    return (
      <Container className="py-secao">
        <EstadoVazio titulo="Não encontramos esse ticket" descricao="Ele pode ter sido aberto em outro navegador. Seus tickets ficam na central de suporte." acao={<BotaoLink href="/suporte">Ir para a central de suporte</BotaoLink>} />
      </Container>
    );
  }

  const comEspecialista = ticket?.status === "ESCALADO_HUMANO";
  const encerrado = ticket?.status === "RESOLVIDO";
  const mensagens: MensagemTicket[] = ticket?.mensagens ?? [{ id: "boas-vindas", autor: "IA", texto: BOAS_VINDAS, criadoEm: "", sugestoes: ATALHOS }];
  const primeiraDoAtendente = mensagens.findIndex((m) => m.autor === "ATENDENTE");
  const comAssistente = mensagens.filter((m) => m.autor !== "ATENDENTE" && primeiraDoAtendente >= 0 && mensagens.indexOf(m) < primeiraDoAtendente).length;

  return (
    <Container className="grid items-start gap-6 py-secao lg:grid-cols-[18rem_minmax(0,1fr)]">
      {comEspecialista && ticket ? (
        <PainelEspecialista ticket={ticket} ocupado={ocupado} aoVoltar={() => void executar(() => voltarParaAssistente(ticket.ticketId), "Não foi possível voltar. Tente de novo.")} />
      ) : (
        <PainelAssistente ocupado={ocupado} aoAtalho={enviar} />
      )}

      <section aria-label="Conversa" className="flex min-h-120 flex-col overflow-hidden rounded-painel border border-superficie-2 bg-superficie shadow-card">
        <header className="flex items-center justify-between gap-3 border-b border-borda px-4 py-3">
          <div className="flex items-center gap-3">
            {comEspecialista ? (
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-borda bg-superficie-2 text-apoio font-bold text-terracota" aria-hidden="true">{ATENDENTE[0]}</span>
            ) : (
              <Image src="/suporte/jurema.png" alt="" width={42} height={42} className="size-10 rounded-full" />
            )}
            <div className="flex flex-col">
              <p className="text-apoio font-bold text-tinta">{comEspecialista ? `${ATENDENTE} · Especialista Origem` : ASSISTENTE}</p>
              <p className="inline-flex items-center gap-1.5 text-legenda text-selo">
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                {comEspecialista ? "Atendente humano" : "Assistente virtual"}
              </p>
            </div>
          </div>
          {comEspecialista ? (
            <p className="text-legenda text-aviso">Resposta estimada: 3 min</p>
          ) : ticket && !encerrado ? (
            <div className="flex items-center gap-3">
              <StatusTicket status={ticket.status} />
              <button type="button" disabled={ocupado} onClick={() => enviar("Falar com uma pessoa")} className="text-apoio text-terracota hover:underline disabled:opacity-60">Falar com uma pessoa</button>
            </div>
          ) : null}
        </header>

        <ol className="flex flex-1 flex-col gap-3 p-4">
          {mensagens.map((m, i) => (
            <Fragment key={m.id}>
              {i === primeiraDoAtendente && (
                <li className="text-legenda text-tinta-3">Contexto anterior preservado · {comAssistente} mensagens com a assistente virtual</li>
              )}
              <Balao m={m} ultima={i === mensagens.length - 1 && !encerrado} aoSugerir={enviar} />
            </Fragment>
          ))}
          {ocupado && <li className="self-start text-legenda text-tinta-3" aria-live="polite">{comEspecialista ? `${ATENDENTE} está digitando` : `${ASSISTENTE} está escrevendo`}</li>}
          <div ref={fimRef} />
        </ol>

        {falha && <div className="px-4 pb-2"><AvisoFormulario mensagem={falha} /></div>}

        {encerrado ? (
          <p className="border-t border-borda px-4 py-3 text-apoio text-tinta-3">
            Ticket respondido e encerrado. Precisa de mais alguma coisa?{" "}
            <Link href="/suporte/chat" className="font-bold text-terracota hover:underline">Comece outra conversa</Link>.
          </p>
        ) : (
          <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); enviar(texto); }} className="flex items-end gap-2 border-t border-borda p-3">
            <label htmlFor="chat-texto" className="sr-only">Sua mensagem</label>
            <textarea id="chat-texto" rows={1} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); } }} placeholder={comEspecialista ? `Escreva para ${ATENDENTE}` : "Digite sua mensagem"} className="max-h-32 min-h-11 flex-1 resize-y rounded-raio border border-borda bg-superficie px-3 py-2 text-corpo text-tinta placeholder:text-tinta-4 hover:border-borda-forte" />
            {comEspecialista ? (
              <Botao type="submit" disabled={ocupado || !texto.trim()}>Enviar</Botao>
            ) : (
              <Botao type="submit" disabled={ocupado || !texto.trim()} aria-label="Enviar mensagem" className="px-3"><ArrowRight className="size-4" aria-hidden="true" /></Botao>
            )}
          </form>
        )}
        {ticket && !encerrado && (
          <div className="border-t border-superficie-2 px-4 py-2">
            <button type="button" disabled={ocupado} onClick={() => void executar(() => resolver(ticket.ticketId), "Não foi possível encerrar.")} className="text-legenda text-tinta-3 hover:text-terracota hover:underline disabled:opacity-60">Marcar como resolvido</button>
          </div>
        )}
      </section>
    </Container>
  );
}
