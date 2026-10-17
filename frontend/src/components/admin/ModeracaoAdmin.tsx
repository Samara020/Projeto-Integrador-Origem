"use client";

import Link from "next/link";
import { FiltroStatus } from "@/components/admin/FiltroStatus";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Estrelas } from "@/components/ui/Estrelas";
import { Foto } from "@/components/ui/Foto";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useAcoesAdmin, useAvaliacoesSinalizadas } from "@/hooks/useAdmin";
import { formatarData } from "@/lib/formato";
import type { AcaoModeracao, AvaliacaoSinalizada, MotivoSinalizacao, StatusAvaliacao } from "@/types";

// "" é o padrão da tela (em moderação): URL sem status ou com status desconhecido cai aqui.
type Filtro = "" | "PUBLICADO" | "REMOVIDO" | "TODAS";

const FILTROS: { id: Filtro; nome: string; vazio: string }[] = [
  { id: "", nome: "Em moderação", vazio: "Nenhuma avaliação aguardando moderação" },
  { id: "PUBLICADO", nome: "Mantidas", vazio: "Nenhuma avaliação mantida" },
  { id: "REMOVIDO", nome: "Removidas", vazio: "Nenhuma avaliação removida" },
  { id: "TODAS", nome: "Todas", vazio: "Nenhuma avaliação sinalizada" },
];

const ROTULO_MOTIVO: Record<MotivoSinalizacao, string> = {
  LINK_OU_CONTATO: "Contato fora da plataforma",
  OFENSA: "Linguagem ofensiva",
  SPAM: "Propaganda",
  DENUNCIA: "Denunciada pelo artesão",
};

const SELO_STATUS: Record<StatusAvaliacao, { variante: "aviso" | "sucesso" | "erro"; rotulo: string }> = {
  EM_MODERACAO: { variante: "aviso", rotulo: "Em moderação" },
  PUBLICADO: { variante: "sucesso", rotulo: "Mantida" },
  REMOVIDO: { variante: "erro", rotulo: "Removida" },
};

function pertence(avaliacao: AvaliacaoSinalizada, filtro: Filtro) {
  if (filtro === "TODAS") return true;
  return avaliacao.status === (filtro || "EM_MODERACAO");
}

function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-label="Carregando avaliações sinalizadas" aria-busy="true">
      <Esqueleto className="h-10 w-80 max-w-full" />
      {Array.from({ length: 3 }, (_, indice) => (
        <Esqueleto key={indice} className="h-40" />
      ))}
    </div>
  );
}

export default function ModeracaoAdmin() {
  const { valor, definir } = useFiltroUrl("status");
  const filtro: Filtro = FILTROS.find((item) => item.id && item.id === valor)?.id ?? "";

  // Uma requisição só: a tela filtra e conta localmente.
  const { dados, carregando, erro, recarregar } = useAvaliacoesSinalizadas();
  const { moderarAvaliacao, salvando, erro: erroDeAcao } = useAcoesAdmin();

  const todas = dados?.itens ?? [];
  const avaliacoes = todas.filter((avaliacao) => pertence(avaliacao, filtro));
  const opcoes = FILTROS.map((item) => ({
    id: item.id,
    nome: item.nome,
    total: todas.filter((avaliacao) => pertence(avaliacao, item.id)).length,
  }));
  const vazio = FILTROS.find((item) => item.id === filtro)?.vazio ?? FILTROS[0].vazio;

  function moderar(avaliacao: AvaliacaoSinalizada, acao: AcaoModeracao) {
    const removida = acao === "REMOVER";
    void moderarAvaliacao(avaliacao.id, acao, () => {
      toaster.create({
        type: "success",
        title: removida ? "Avaliação removida" : "Avaliação mantida",
        description: removida
          ? "O comentário sai da página da peça."
          : "O comentário continua visível na página da peça.",
      });
      recarregar();
    }).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-titulo text-h1 font-bold text-tinta">Moderação de conteúdo</h1>
        <p className="text-corpo text-tinta-2">
          Avaliações sinalizadas por contato fora da plataforma, ofensa, propaganda ou denúncia do
          artesão. Remova o que fere as regras e mantenha o resto no ar.
        </p>
      </header>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      ) : (
        <>
          <FiltroStatus opcoes={opcoes} ativo={filtro} aoEscolher={definir} />

          {erroDeAcao ? (
            <p role="alert" className="text-apoio text-erro">
              {erroDeAcao.message}
            </p>
          ) : null}

          {avaliacoes.length === 0 ? (
            <EstadoVazio
              titulo={vazio}
              descricao="As avaliações sinalizadas pelo sistema ou pelos artesãos aparecem aqui."
              acao={
                filtro === "TODAS" ? undefined : (
                  <BotaoLink href="/painel/admin/moderacao?status=TODAS" variante="secundario">
                    Ver todas
                  </BotaoLink>
                )
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {avaliacoes.map((avaliacao) => {
                const selo = SELO_STATUS[avaliacao.status];
                const ocupado = salvando === `moderar:${avaliacao.id}`;
                return (
                  <li key={avaliacao.id}>
                    <article className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card">
                      <div className="flex gap-4">
                        <Foto
                          src={avaliacao.produto.imagemPrincipal}
                          alt={avaliacao.produto.nome}
                          width={64}
                          height={64}
                          className="size-16 shrink-0 rounded-raio object-cover"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-col gap-1">
                            <h2>
                              <Link
                                href={`/produto/${avaliacao.produto.id}`}
                                className="font-titulo text-h3 font-bold text-terracota hover:text-terracota-escura"
                              >
                                {avaliacao.produto.nome}
                              </Link>
                            </h2>
                            <p className="text-legenda text-tinta-3">
                              {avaliacao.autor} · {formatarData(avaliacao.criadoEm)}
                            </p>
                            <Estrelas nota={avaliacao.nota} />
                          </div>
                          <div className="shrink-0">
                            <Selo variante={selo.variante}>{selo.rotulo}</Selo>
                          </div>
                        </div>
                      </div>

                      <blockquote className="border-l-2 border-borda pl-3 text-corpo text-tinta-2">
                        {avaliacao.comentario}
                      </blockquote>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <Selo variante="neutro">{ROTULO_MOTIVO[avaliacao.motivo]}</Selo>
                        <p className="text-apoio text-tinta-2">
                          Sinalizada em {formatarData(avaliacao.sinalizadaEm)}
                        </p>
                      </div>

                      {avaliacao.status === "EM_MODERACAO" ? (
                        <div className="flex flex-col gap-3 border-t border-borda pt-4 sm:flex-row sm:justify-end">
                          <Botao
                            variante="contorno"
                            larguraTotal
                            className="sm:w-auto"
                            carregando={ocupado}
                            disabled={salvando !== null}
                            onClick={() => moderar(avaliacao, "REMOVER")}
                          >
                            Remover avaliação
                          </Botao>
                          <Botao
                            variante="secundario"
                            larguraTotal
                            className="sm:w-auto"
                            carregando={ocupado}
                            disabled={salvando !== null}
                            onClick={() => moderar(avaliacao, "MANTER")}
                          >
                            Manter publicada
                          </Botao>
                        </div>
                      ) : avaliacao.moderadaEm ? (
                        <p className="border-t border-borda pt-4 text-apoio font-bold text-tinta">
                          Moderada em {formatarData(avaliacao.moderadaEm)}
                        </p>
                      ) : null}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
