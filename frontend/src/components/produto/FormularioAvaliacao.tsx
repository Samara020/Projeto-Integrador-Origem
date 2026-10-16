"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AvisoFormulario } from "@/components/conta/AvisoFormulario";
import { Botao } from "@/components/ui/Botao";
import { toaster } from "@/components/ui/toaster";
import { useMinhasAvaliacoes } from "@/hooks/useMinhasAvaliacoes";
import { usePedidos } from "@/hooks/usePedidos";
import { useSessao } from "@/hooks/useSessao";
import { ApiError } from "@/lib/http";
import { avaliacoesService } from "@/services/avaliacoes";
import type { ProdutoDetalhe } from "@/types";

const COMPRA_CONFIRMADA = ["PAGO", "ENVIADO", "ENTREGUE"];

// Só quem comprou a peça avalia (HU-19). O pedido vem do histórico do comprador.
export function FormularioAvaliacao({ produto }: { produto: ProdutoDetalhe }) {
  const { usuario } = useSessao();
  const pedidos = usePedidos();
  const minhas = useMinhasAvaliacoes();
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const pedido = pedidos.dados?.pedidos.find(
    (p) => COMPRA_CONFIRMADA.includes(p.status) && p.itens.some((i) => i.produtoId === produto.id),
  );
  const jaAvaliou = pedido && minhas.minhas.some((a) => a.pedidoId === pedido.id && a.produtoId === produto.id);

  if (enviada || jaAvaliou) return null;

  if (!pedido) {
    return (
      <p className="rounded-raio border border-dashed border-borda-forte px-4 py-3 text-apoio text-tinta-2">
        Só quem comprou esta peça pode avaliar.{" "}
        {usuario ? (
          "Depois que o seu pedido for pago, o formulário aparece aqui."
        ) : (
          <Link href="/entrar" className="font-bold text-terracota hover:underline">
            Entre na sua conta
          </Link>
        )}
      </p>
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nota === 0) return setErro("Escolha de 1 a 5 estrelas.");
    if (comentario.trim().length < 10) return setErro("Conte um pouco mais: pelo menos 10 caracteres.");
    setEnviando(true);
    setErro(null);
    try {
      const criada = await avaliacoesService.criar(
        { pedidoId: pedido!.id, produtoId: produto.id, nota, comentario: comentario.trim() },
        { nome: produto.nome, imagemPrincipal: produto.imagemPrincipal },
      );
      await minhas.recarregar();
      setEnviada(true);
      toaster.create({
        type: "success",
        title: criada.status === "PUBLICADO" ? "Avaliação publicada" : "Avaliação em moderação",
        description: criada.status === "PUBLICADO" ? "Obrigado por contar como foi." : "Textos com link ou contato passam pela equipe antes de aparecer.",
      });
    } catch (causa) {
      setErro(causa instanceof ApiError ? causa.message : "Não foi possível enviar. Tente de novo.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-labelledby="avaliar-titulo" className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="avaliar-titulo" className="font-titulo text-h3 font-bold text-tinta">Como foi a sua compra?</h2>
        <p className="text-apoio text-tinta-3">Pedido {pedido.id}. Sua avaliação aparece com o nome da conta.</p>
      </div>
      {erro && <AvisoFormulario mensagem={erro} />}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-apoio font-bold text-tinta">Nota</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((valor) => (
            <button key={valor} type="button" onClick={() => setNota(valor)} aria-label={`${valor} ${valor === 1 ? "estrela" : "estrelas"}`} aria-pressed={nota === valor} className="inline-flex size-10 items-center justify-center rounded-raio hover:bg-superficie-2">
              <Star aria-hidden="true" className={`size-6 ${valor <= nota ? "fill-aviso text-aviso" : "text-borda-forte"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="avaliar-comentario" className="text-apoio font-bold text-tinta">Comentário</label>
        <textarea id="avaliar-comentario" rows={4} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Como a peça chegou, se ficou como na foto, o que mais chamou atenção." className="w-full rounded-raio border border-borda bg-superficie px-3 py-2 text-corpo text-tinta placeholder:text-tinta-4 hover:border-borda-forte" />
      </div>
      <Botao type="submit" carregando={enviando} className="self-start">
        {enviando ? "Enviando" : "Publicar avaliação"}
      </Botao>
    </form>
  );
}
