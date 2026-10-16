"use client";

import { CheckCircle2, Paperclip } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Container } from "@/components/layout/Container";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Selecao } from "@/components/ui/Selecao";
import { Selo } from "@/components/ui/Selo";
import { useProduto } from "@/hooks/useProdutos";
import { formatarMoeda, plural } from "@/lib/formato";
import { ApiError } from "@/lib/http";
import { estimar, personalizacaoService } from "@/services/personalizacao";
import type { Personalizacao as Solicitacao, ProdutoDetalhe } from "@/types";

const CORES = [
  { id: "", nome: "Como na foto" },
  { id: "terracota", nome: "Terracota natural" },
  { id: "cru", nome: "Cru e branco" },
  { id: "terra", nome: "Tons de terra" },
  { id: "azul", nome: "Azul e branco" },
];
const TAMANHOS = [
  { id: "", nome: "Como na foto" },
  { id: "pequeno", nome: "Pequeno, cerca de 60% do original" },
  { id: "grande", nome: "Grande, cerca de 130% do original" },
  { id: "medida", nome: "Sob medida, descrevo nos detalhes" },
];

function Formulario({ produto }: { produto: ProdutoDetalhe }) {
  const [dados, setDados] = useState({ cor: "", tamanho: "", inscricao: "", detalhes: "", mensagem: "" });
  const [referencias, setReferencias] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState<Solicitacao | null>(null);
  const estimativa = estimar(produto, dados);
  const campo = (chave: keyof typeof dados) => ({ value: dados[chave], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDados((d) => ({ ...d, [chave]: e.target.value })) });

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      setEnviada(await personalizacaoService.enviar(produto, dados));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (causa) {
      setErro(causa instanceof ApiError ? causa.message : "Não foi possível enviar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <section role="status" className="flex max-w-2xl flex-col items-start gap-4 rounded-painel border border-borda bg-superficie p-6 shadow-card sm:p-8">
        <CheckCircle2 className="size-10 text-selo" aria-hidden="true" />
        <h2 className="font-titulo text-h2 font-bold text-tinta">Solicitação enviada para {produto.artesao.nome}</h2>
        <p className="text-corpo text-tinta-2">
          Pedido de personalização {enviada.id}. O artesão confirma prazo e valor em até 2 dias úteis, e você recebe um e-mail com a resposta.
        </p>
        <dl className="grid w-full gap-3 rounded-raio bg-areia p-4 text-apoio sm:grid-cols-2">
          <div><dt className="text-tinta-3">Prazo estimado adicional</dt><dd className="font-bold text-tinta">+ {plural(enviada.prazoAdicionalDias, "dia útil", "dias úteis")}</dd></div>
          <div><dt className="text-tinta-3">Preço estimado adicional</dt><dd className="font-bold tabular-nums text-tinta">+ {formatarMoeda(enviada.precoAdicional)}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <BotaoLink href={`/produto/${produto.id}`}>Voltar para a peça</BotaoLink>
          <BotaoLink href="/catalogo" variante="secundario">Ver o catálogo</BotaoLink>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-raio border border-borda bg-superficie p-3">
          <Image src={produto.imagemPrincipal} alt="" width={90} height={72} className="h-18 w-22 rounded-raio object-cover" />
          <div className="flex flex-col gap-0.5">
            <p className="text-legenda font-bold uppercase tracking-wide text-terracota">Peça base selecionada</p>
            <p className="font-titulo text-h3 font-bold text-tinta">{produto.nome}</p>
            <p className="text-legenda text-tinta-3">{produto.artesao.nome} · {produto.regiao.nome}</p>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-raio border border-borda bg-superficie p-4">
          <legend className="sr-only">Opções de customização</legend>
          <h2 className="mb-2 font-titulo text-h3 font-bold text-tinta">Opções de customização</h2>
          {erro && <AvisoFormulario mensagem={erro} />}
          <Selecao id="perso-cor" rotulo="Cor" opcoes={CORES} {...campo("cor")} />
          <Selecao id="perso-tamanho" rotulo="Tamanho" opcoes={TAMANHOS} {...campo("tamanho")} />
          <Campo id="perso-inscricao" rotulo="Inscrição" placeholder="Nome, data ou frase curta" maxLength={40} {...campo("inscricao")} />
          <Campo id="perso-detalhes" rotulo="Detalhes" placeholder="Ex.: grafismo de mandacaru, acabamento fosco" {...campo("detalhes")} />
          <div className="flex flex-col gap-2">
            <label htmlFor="perso-mensagem" className="text-apoio font-bold text-tinta">Mensagem ao artesão</label>
            <textarea id="perso-mensagem" rows={3} placeholder="Para que ocasião é, o que não pode faltar, o que você quer evitar." className="w-full rounded-raio border border-borda bg-superficie px-3 py-2 text-corpo text-tinta placeholder:text-tinta-4 hover:border-borda-forte" {...campo("mensagem")} />
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-raio border border-dashed border-aviso px-4 py-3 text-apoio text-tinta-2 hover:border-terracota">
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            {referencias.length === 0 ? "Enviar fotos de referência · PNG ou JPG" : referencias.join(", ")}
            <input type="file" accept="image/png,image/jpeg" multiple className="sr-only" onChange={(e) => setReferencias(Array.from(e.target.files ?? []).slice(0, 3).map((f) => f.name))} />
          </label>
        </fieldset>
      </div>

      <aside className="flex flex-col gap-3 rounded-raio border border-borda bg-superficie p-4 lg:sticky lg:top-24">
        <h2 className="font-titulo text-h3 font-bold text-tinta">Como vai ficar</h2>
        <div className="relative aspect-3/2 w-full overflow-hidden rounded-raio bg-areia">
          <Image src={produto.imagemPrincipal} alt="" fill sizes="(min-width: 1024px) 24rem, 100vw" className="object-cover" />
          {produto.seloAtivo && <div className="absolute left-2 top-2"><Selo variante="autentico">Autêntico</Selo></div>}
        </div>
        <dl className="flex flex-col gap-1 rounded-raio bg-areia p-3 text-apoio font-bold text-tinta" aria-live="polite">
          <div className="flex justify-between gap-3"><dt>Prazo estimado adicional</dt><dd className="tabular-nums">+ {plural(estimativa.prazoAdicionalDias, "dia útil", "dias úteis")}</dd></div>
          <div className="flex justify-between gap-3"><dt>Preço estimado adicional</dt><dd className="tabular-nums">+ {formatarMoeda(estimativa.precoAdicional)}</dd></div>
        </dl>
        <p className="text-legenda text-tinta-3">O artesão confirma prazo e valor antes de começar. Peça personalizada não tem devolução por arrependimento.</p>
        <Botao type="submit" larguraTotal carregando={enviando}>{enviando ? "Enviando" : "Enviar solicitação ao artesão"}</Botao>
      </aside>
    </form>
  );
}

export function Personalizacao({ produtoId }: { produtoId: string }) {
  const { dados: produto, carregando, erro, recarregar } = useProduto(produtoId);
  useEffect(() => {
    if (produto) document.title = `Personalizar ${produto.nome} · Origem`;
  }, [produto]);
  const aceita = produto?.modalidadeProducao === "SOB_ENCOMENDA" && produto.disponibilidade === "DISPONIVEL";

  return (
    <Container className="flex flex-col gap-6 py-secao">
      <header className="flex flex-col gap-1">
        {produto && <Link href={`/produto/${produto.id}`} className="inline-flex min-h-10 items-center self-start text-apoio text-terracota hover:underline">Voltar para a peça</Link>}
        <h1 className="font-titulo text-h1 font-bold text-tinta">Personalize com quem sabe fazer.</h1>
        <p className="text-corpo text-tinta-2">{produto ? `Envie sua ideia diretamente para ${produto.artesao.nome}.` : "Envie sua ideia diretamente para o artesão."}</p>
      </header>
      {carregando && <div role="status" aria-label="Carregando peça" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]"><Esqueleto className="h-96" /><Esqueleto className="h-96" /></div>}
      {erro?.status === 404 && <EstadoVazio titulo="Não encontramos essa peça" descricao="Ela pode ter sido vendida ou retirada pelo artesão." acao={<BotaoLink href="/catalogo">Voltar para o catálogo</BotaoLink>} />}
      {erro && erro.status !== 404 && <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />}
      {produto && !aceita && (
        <EstadoVazio titulo="Esta peça não aceita personalização" descricao="Só peças feitas sob encomenda podem ser alteradas. Peça única e pronta entrega saem como estão." acao={<BotaoLink href="/catalogo?tecnica=bordado">Ver peças sob encomenda</BotaoLink>} />
      )}
      {produto && aceita && <Formulario produto={produto} />}
    </Container>
  );
}
