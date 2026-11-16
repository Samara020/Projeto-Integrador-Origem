"use client";

import { useState } from "react";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";
import { ROTULO_SITUACAO, TabelaEstoqueArtesao } from "@/components/painel/TabelaEstoqueArtesao";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useAcoesArtesao, usePecasArtesao } from "@/hooks/usePainelArtesao";
import type { SituacaoPeca } from "@/types";

const FILTROS: { id: SituacaoPeca | ""; nome: string }[] = [
  { id: "", nome: "Todos" },
  { id: "ATIVO", nome: "Ativos" },
  { id: "INATIVO", nome: "Inativos" },
  { id: "ESGOTADO", nome: "Esgotados" },
  { id: "ESTOQUE_BAIXO", nome: "Estoque baixo" },
];

export default function EstoqueArtesao() {
  const { valor: filtro, definir } = useFiltroUrl("situacao");
  const filtroValido = FILTROS.some((item) => item.id === filtro);
  const situacao = (filtroValido && filtro !== "" ? filtro : undefined) as SituacaoPeca | undefined;
  const filtroAtivo = filtroValido ? filtro : "";

  const { dados, carregando, erro, recarregar } = usePecasArtesao(situacao);
  const { alterarEstoque, removerPeca, salvando, erro: erroDeAcao, limparErro } = useAcoesArtesao();

  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const contagem = dados?.contagem;
  const pecas = dados?.itens ?? [];

  function contagemDe(id: SituacaoPeca | "") {
    if (!id) {
      if (!contagem) return 0;
      return (
        (contagem.ATIVO ?? 0) +
        (contagem.INATIVO ?? 0) +
        (contagem.ESGOTADO ?? 0) +
        (contagem.ESTOQUE_BAIXO ?? 0)
      );
    }
    return contagem?.[id] ?? 0;
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Peças e disponibilidade"
        titulo="Gestão de estoque"
        descricao="Cada peça que você publica aparece aqui. Pause quando faltar material e volte a expor quando der."
        acoes={
          <BotaoLink href="/painel/artesao/pecas/nova" variante="primario">
            Cadastrar peça
          </BotaoLink>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((item) => {
          const ativo = filtroAtivo === item.id;
          return (
            <button
              key={item.id || "todos"}
              type="button"
              aria-pressed={ativo}
              onClick={() => {
                limparErro();
                setErroValidacao(null);
                definir(item.id ?? "");
              }}
              className={`inline-flex min-h-[40px] h-10 items-center rounded-full px-3 text-apoio font-bold transition-colors duration-150 ${
                ativo
                  ? "bg-terracota text-white"
                  : "border border-borda bg-superficie text-tinta-2 hover:border-borda-forte hover:text-tinta"
              }`}
            >
              {item.nome} {contagemDe(item.id)}
            </button>
          );
        })}
      </div>

      {erroDeAcao ? (
        <p role="alert" className="text-apoio text-erro">
          {erroDeAcao.message}
        </p>
      ) : null}

      {carregando ? (
        <Cartao>
          <ul className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, indice) => (
              <li key={indice} className="flex items-center gap-4">
                <Esqueleto className="size-14" />
                <div className="flex-1">
                  <Esqueleto className="h-4 w-48" />
                  <Esqueleto className="mt-2 h-3 w-24" />
                </div>
                <Esqueleto className="h-4 w-10" />
                <Esqueleto className="h-6 w-24" />
              </li>
            ))}
          </ul>
        </Cartao>
      ) : erro ? (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      ) : pecas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma peça com esse filtro"
          descricao={
            situacao
              ? `Você não tem peça em "${ROTULO_SITUACAO[situacao].toLowerCase()}" agora.`
              : "Cadastre a primeira peça para ela aparecer na vitrine da Origem."
          }
          acao={
            situacao ? (
              <Botao variante="contorno" onClick={() => definir("")}>
                Ver todas as peças
              </Botao>
            ) : (
              <BotaoLink href="/painel/artesao/pecas/nova" variante="primario">
                Cadastrar peça
              </BotaoLink>
            )
          }
        />
      ) : (
        <TabelaEstoqueArtesao
          pecas={pecas}
          erroValidacao={erroValidacao}
          definirErroValidacao={setErroValidacao}
          salvando={salvando}
          alterarEstoque={alterarEstoque}
          removerPeca={removerPeca}
          limparErro={limparErro}
          aoRecarregar={recarregar}
        />
      )}
    </div>
  );
}
