"use client";

import { useState } from "react";
import { FiltroStatus } from "@/components/admin/FiltroStatus";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";
import { AreaTexto } from "@/components/ui/AreaTexto";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Foto } from "@/components/ui/Foto";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useAcoesAdmin, usePecasPendentes } from "@/hooks/useAdmin";
import { formatarData } from "@/lib/formato";
import type { DecisaoValidacao, PecaPendente, StatusValidacao } from "@/types";

// "" é o padrão da tela (pendentes): URL sem status ou com status desconhecido cai aqui.
type Filtro = "" | "APROVADA" | "REPROVADA" | "TODAS";

const FILTROS: { id: Filtro; nome: string; vazio: string }[] = [
  { id: "", nome: "Pendentes", vazio: "Nenhuma peça aguardando validação" },
  { id: "APROVADA", nome: "Aprovadas", vazio: "Nenhuma peça aprovada ainda" },
  { id: "REPROVADA", nome: "Reprovadas", vazio: "Nenhuma peça reprovada" },
  { id: "TODAS", nome: "Todas", vazio: "Nenhuma peça enviada" },
];

const SELO_STATUS: Record<StatusValidacao, { variante: "aviso" | "sucesso" | "erro"; rotulo: string }> = {
  PENDENTE: { variante: "aviso", rotulo: "Pendente" },
  APROVADA: { variante: "sucesso", rotulo: "Aprovada" },
  REPROVADA: { variante: "erro", rotulo: "Reprovada" },
};

const MINIMO_JUSTIFICATIVA = 10;

function pertence(peca: PecaPendente, filtro: Filtro) {
  if (filtro === "TODAS") return true;
  return peca.statusValidacao === (filtro || "PENDENTE");
}

function Carregando() {
  return (
    <div role="status" aria-label="Carregando peças enviadas" aria-busy="true" className="flex flex-col gap-4">
      <Esqueleto className="h-10 w-80 max-w-full" />
      {Array.from({ length: 3 }, (_, indice) => (
        <Esqueleto key={indice} className="h-40" />
      ))}
    </div>
  );
}

export default function ValidacoesAdmin() {
  const { valor, definir } = useFiltroUrl("status");
  // Status ausente ou inválido na URL cai em Pendentes ("").
  const filtro: Filtro = FILTROS.find((item) => item.id && item.id === valor)?.id ?? "";

  // Uma requisição só: a tela filtra e conta localmente.
  const { dados, carregando, erro, recarregar } = usePecasPendentes();
  const { validarPeca, salvando, erro: erroDeAcao } = useAcoesAdmin();

  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  // Qual botão da peça foi clicado: só ele entra em carregando.
  const [acaoEmCurso, setAcaoEmCurso] = useState<Record<string, DecisaoValidacao["status"]>>({});

  const todas = dados?.itens ?? [];
  const pecas = todas.filter((peca) => pertence(peca, filtro));
  const opcoes = FILTROS.map((item) => ({
    id: item.id,
    nome: item.nome,
    total: todas.filter((peca) => pertence(peca, item.id)).length,
  }));
  const vazio = FILTROS.find((item) => item.id === filtro)?.vazio ?? FILTROS[0].vazio;

  function escrever(id: string, texto: string) {
    setJustificativas((atual) => ({ ...atual, [id]: texto }));
    if (errosCampo[id]) setErrosCampo((atual) => ({ ...atual, [id]: "" }));
  }

  function decidir(peca: PecaPendente, status: DecisaoValidacao["status"]) {
    const justificativa = (justificativas[peca.id] ?? "").trim();
    if (status === "REPROVADA" && justificativa.length < MINIMO_JUSTIFICATIVA) {
      setErrosCampo((atual) => ({
        ...atual,
        [peca.id]: "Explique o motivo da reprovação em pelo menos 10 caracteres.",
      }));
      return;
    }

    const aprovada = status === "APROVADA";
    setAcaoEmCurso((atual) => ({ ...atual, [peca.id]: status }));
    void validarPeca(peca.id, { status, justificativa }, () => {
      toaster.create({
        type: "success",
        title: aprovada ? `Peça aprovada: ${peca.nome}` : `Peça reprovada: ${peca.nome}`,
        description: aprovada
          ? "A peça ganha o selo Autêntico e entra no catálogo."
          : "O artesão recebe a justificativa.",
      });
      setJustificativas((atual) => ({ ...atual, [peca.id]: "" }));
      recarregar();
    }).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-titulo text-h1 font-bold text-tinta">Validação de origem</h1>
        <p className="text-corpo text-tinta-2">
          Confira a história e as evidências de cada peça antes de liberar o selo Autêntico.
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

          {pecas.length === 0 ? (
            <EstadoVazio
              titulo={vazio}
              descricao={
                filtro === ""
                  ? "Você já decidiu todas as peças enviadas."
                  : "As peças enviadas pelos artesãos aparecem aqui."
              }
              acao={
                filtro === "TODAS" ? undefined : (
                  <BotaoLink href="/painel/admin/validacoes?status=TODAS" variante="secundario">
                    Ver todas
                  </BotaoLink>
                )
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {pecas.map((peca) => {
                const selo = SELO_STATUS[peca.statusValidacao];
                const ocupado = salvando === `validar:${peca.id}`;
                return (
                  <li key={peca.id}>
                    <article className="flex flex-col gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card">
                      <div className="flex gap-4">
                        <Foto
                          src={peca.imagemPrincipal}
                          alt={peca.nome}
                          width={96}
                          height={64}
                          className="h-16 w-24 shrink-0 rounded-raio object-cover"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-col gap-1">
                            <h2 className="font-titulo text-h3 font-bold text-tinta">{peca.nome}</h2>
                            <p className="text-legenda text-tinta-3">
                              {peca.artesao.nome} · {peca.regiao}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <Selo variante={selo.variante}>{selo.rotulo}</Selo>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <p className="text-apoio text-tinta-2">
                          Técnica: {peca.tecnica} · Enviada em {formatarData(peca.enviadoEm)}
                        </p>
                        <p className="text-corpo text-tinta">{peca.informacoesOrigem}</p>
                        <p className="text-apoio text-tinta-2 wrap-anywhere">
                          {peca.certificado ? `Certificado: ${peca.certificado}` : "Sem certificado anexado"}
                        </p>
                      </div>

                      {peca.statusValidacao === "PENDENTE" ? (
                        <div className="flex flex-col gap-2 border-t border-borda pt-4">
                          <AreaTexto
                            id={`justificativa-${peca.id}`}
                            rotulo="Justificativa"
                            dica="Obrigatória para reprovar. O artesão recebe este texto."
                            erro={errosCampo[peca.id] || undefined}
                            value={justificativas[peca.id] ?? ""}
                            onChange={(evento) => escrever(peca.id, evento.target.value)}
                          />
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <Botao
                              variante="primario"
                              larguraTotal
                              className="sm:w-auto"
                              carregando={ocupado && acaoEmCurso[peca.id] === "APROVADA"}
                              disabled={salvando !== null}
                              onClick={() => decidir(peca, "APROVADA")}
                            >
                              Aprovar
                            </Botao>
                            <Botao
                              variante="contorno"
                              larguraTotal
                              className="sm:w-auto"
                              carregando={ocupado && acaoEmCurso[peca.id] === "REPROVADA"}
                              disabled={salvando !== null}
                              onClick={() => decidir(peca, "REPROVADA")}
                            >
                              Reprovar
                            </Botao>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 border-t border-borda pt-4">
                          {peca.decididoEm ? (
                            <p className="text-apoio font-bold text-tinta">
                              Decidida em {formatarData(peca.decididoEm)}
                            </p>
                          ) : null}
                          <p className="text-corpo text-tinta-2">
                            {peca.justificativa || "Sem justificativa registrada"}
                          </p>
                        </div>
                      )}
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
