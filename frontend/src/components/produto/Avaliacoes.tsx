"use client";

import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Estrelas } from "@/components/ui/Estrelas";
import { useAvaliacoes } from "@/hooks/useProdutos";
import { formatarData } from "@/lib/formato";

export function Avaliacoes({ produtoId }: { produtoId: string }) {
  const { dados, carregando, erro, recarregar } = useAvaliacoes(produtoId);

  return (
    <section
      id="avaliacoes"
      aria-labelledby="avaliacoes-titulo"
      className="flex scroll-mt-32 flex-col gap-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id="avaliacoes-titulo"
          className="font-titulo text-h2 font-bold text-tinta"
        >
          O que dizem de quem comprou
        </h2>
        <BotaoLink href={`/produto/${produtoId}/avaliacoes`} variante="secundario">
          Ver todas e avaliar
        </BotaoLink>
      </div>

      {carregando && (
        <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="Carregando avaliações">
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} className="h-32" />
          ))}
        </div>
      )}
      {erro && <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />}
      {dados && dados.total === 0 && (
        <EstadoVazio
          titulo="Esta peça ainda não tem avaliações"
          descricao="Quem compra pode avaliar depois que o pedido chega."
        />
      )}
      {dados && dados.total > 0 && (
        <ul className="grid gap-4 md:grid-cols-3">
          {dados.itens.slice(0, 3).map((avaliacao) => (
            <li
              key={avaliacao.id}
              className="flex flex-col gap-2 rounded-raio border border-superficie-2 bg-superficie p-4"
            >
              <Estrelas nota={avaliacao.nota} />
              <p className="text-apoio text-tinta-2">{avaliacao.comentario}</p>
              <p className="mt-auto text-legenda text-tinta-3">
                {avaliacao.autor} · {formatarData(avaliacao.criadoEm)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
