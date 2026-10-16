"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Container } from "@/components/layout/Container";
import { StatusTicket } from "@/components/suporte/StatusTicket";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Selecao } from "@/components/ui/Selecao";
import { useTickets } from "@/hooks/useSuporte";
import { tempoRelativo } from "@/lib/formato";
import { ApiError } from "@/lib/http";
import { ARTIGOS_AJUDA, CATEGORIAS_SUPORTE } from "@/services/suporte";
import type { CategoriaSuporte, PrioridadeTicket } from "@/types";

const CARTAO = "flex flex-col gap-3 rounded-raio border border-superficie-2 bg-superficie p-4";

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Artigos({ busca }: { busca: string }) {
  const [categoria, setCategoria] = useState<CategoriaSuporte | null>(null);
  const termo = semAcento(busca.trim());
  const filtrados = ARTIGOS_AJUDA.filter((a) => (!categoria || a.categoria === categoria) && (!termo || semAcento(`${a.titulo} ${a.resumo}`).includes(termo)));
  const populares = ARTIGOS_AJUDA.filter((a) => a.popular && a.categoria === "troca");

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="faq-titulo" className={CARTAO}>
        <h2 id="faq-titulo" className="font-titulo text-h3 font-bold text-tinta">Perguntas frequentes</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por assunto">
          {CATEGORIAS_SUPORTE.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategoria(categoria === c.id ? null : c.id)} aria-pressed={categoria === c.id} className={`inline-flex h-9 items-center rounded-full px-3 text-apoio font-bold ${categoria === c.id ? "bg-terracota text-white" : "bg-areia text-terracota hover:bg-terracota/15"}`}>
              {c.nome}
            </button>
          ))}
        </div>
        {filtrados.length === 0 ? (
          <p className="text-apoio text-tinta-3">Nenhuma pergunta com essas palavras. Abra um ticket ao lado que a gente responde.</p>
        ) : (
          <ul className="flex flex-col">
            {filtrados.map((a) => (
              <li key={a.id}>
                <details className="group border-b border-superficie-2 last:border-b-0">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 py-2 text-apoio text-tinta marker:content-none hover:text-terracota">
                    <span aria-hidden="true" className="text-tinta-3 transition-transform duration-150 group-open:rotate-90">›</span>
                    {a.titulo}
                  </summary>
                  <p className="pb-3 pl-4 text-apoio text-tinta-2">{a.resumo}</p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
      {!termo && !categoria && (
        <section aria-labelledby="populares-titulo" className={CARTAO}>
          <h2 id="populares-titulo" className="font-titulo text-h3 font-bold text-tinta">Artigos populares</h2>
          <ul className="flex flex-col">
            {populares.map((a) => (
              <li key={a.id}>
                <details className="group">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center py-2 text-apoio text-tinta marker:content-none hover:text-terracota">{a.titulo}</summary>
                  <p className="pb-3 text-apoio text-tinta-2">{a.resumo}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NovoTicket() {
  const router = useRouter();
  const { abrir } = useTickets();
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeTicket>("NORMAL");
  const [anexos, setAnexos] = useState<string[]>([]);
  const [erros, setErros] = useState<{ assunto?: string; descricao?: string }>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const novos = { assunto: assunto.trim().length < 3 ? "Diga o assunto em poucas palavras." : undefined, descricao: descricao.trim().length < 10 ? "Conte um pouco mais: pelo menos 10 caracteres." : undefined };
    setErros(novos);
    if (novos.assunto || novos.descricao) return;
    setEnviando(true);
    setFalha(null);
    try {
      const ticket = await abrir({ assunto, mensagem: descricao, prioridade });
      router.push(`/suporte/${ticket.ticketId}`);
    } catch (causa) {
      setFalha(causa instanceof ApiError ? causa.message : "Não foi possível abrir o ticket. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <form id="novo-ticket" onSubmit={enviar} noValidate aria-labelledby="ticket-titulo" className={`${CARTAO} scroll-mt-32 gap-2`}>
      <h2 id="ticket-titulo" className="mb-1 font-titulo text-h3 font-bold text-tinta">Abrir um ticket</h2>
      {falha && <AvisoFormulario mensagem={falha} />}
      <Campo id="ticket-assunto" rotulo="Assunto" placeholder="Ex.: dúvida sobre meu pedido" value={assunto} onChange={(e) => setAssunto(e.target.value)} erro={erros.assunto} />
      <div className="flex flex-col gap-2">
        <label htmlFor="ticket-descricao" className="text-apoio font-bold text-tinta">Descrição</label>
        <textarea id="ticket-descricao" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Conte o que aconteceu" aria-invalid={erros.descricao ? true : undefined} aria-describedby="ticket-descricao-erro" className={`w-full rounded-raio border bg-superficie px-3 py-2 text-corpo text-tinta placeholder:text-tinta-4 ${erros.descricao ? "border-erro" : "border-borda hover:border-borda-forte"}`} />
        <p id="ticket-descricao-erro" className="min-h-5 text-apoio text-erro">{erros.descricao}</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-apoio font-bold text-tinta">Anexos</span>
        <label className="flex h-11 cursor-pointer items-center rounded-raio border border-borda bg-superficie px-3 text-apoio text-tinta-3 hover:border-borda-forte">
          {anexos.length === 0 ? "Adicionar arquivos" : anexos.join(", ")}
          <input type="file" multiple className="sr-only" onChange={(e) => setAnexos(Array.from(e.target.files ?? []).slice(0, 3).map((f) => f.name))} />
        </label>
        <p className="min-h-5" aria-hidden="true" />
      </div>
      <Selecao id="ticket-prioridade" rotulo="Prioridade" opcoes={[{ id: "NORMAL", nome: "Normal" }, { id: "ALTA", nome: "Alta, pedido parado ou peça danificada" }]} value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeTicket)} />
      <Botao type="submit" carregando={enviando} className="self-start">{enviando ? "Enviando" : "Enviar solicitação"}</Botao>
    </form>
  );
}

function SeusTickets() {
  const { tickets, carregando } = useTickets();
  return (
    <section aria-labelledby="tickets-titulo" className={CARTAO}>
      <h2 id="tickets-titulo" className="font-titulo text-h3 font-bold text-tinta">Seus tickets</h2>
      {carregando && <Esqueleto className="h-12" />}
      {!carregando && tickets.length === 0 && <p className="text-apoio text-tinta-3">Nenhum ticket aberto até agora.</p>}
      <ul className="flex flex-col gap-3">
        {tickets.map((t) => (
          <li key={t.ticketId} className="flex flex-col gap-0.5">
            <Link href={`/suporte/${t.ticketId}`} className="text-apoio text-tinta hover:text-terracota hover:underline">
              #{t.ticketId} · {t.assunto}
            </Link>
            <StatusTicket status={t.status} complemento={`aberto ${tempoRelativo(t.criadoEm)}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CentralSuporte() {
  const [busca, setBusca] = useState("");
  return (
    <Container className="flex flex-col gap-4 py-secao">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-h1 font-bold text-tinta">Central de suporte</h1>
          <p className="text-corpo text-tinta-2">Encontre respostas ou converse com quem entende cada história.</p>
        </div>
        <BotaoLink href="/suporte/chat">Falar com suporte</BotaoLink>
      </header>
      <div className="relative">
        <label htmlFor="ajuda-busca" className="sr-only">Como podemos ajudar?</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tinta-3" aria-hidden="true" />
        <input id="ajuda-busca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Como podemos ajudar?" className="h-13 w-full rounded-raio border border-borda bg-superficie pl-12 pr-4 text-corpo text-tinta placeholder:text-tinta-4 hover:border-borda-forte" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem_17rem]">
        <Artigos busca={busca} />
        <NovoTicket />
        <SeusTickets />
      </div>
    </Container>
  );
}
