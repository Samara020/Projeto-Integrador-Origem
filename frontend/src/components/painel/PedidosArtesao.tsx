"use client";

import { useState } from "react";
import { TituloSecao } from "@/components/painel/CartaoPainel";
import { PedidoArtesaoCard, ROTULO_STATUS } from "@/components/painel/PedidoArtesaoCard";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";
import { Botao } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Selecao } from "@/components/ui/Selecao";
import { toaster } from "@/components/ui/toaster";
import { useAcoesArtesao, usePedidosArtesao } from "@/hooks/usePainelArtesao";
import { plural } from "@/lib/formato";
import type { PedidoRecebido, ProximaAcaoPedido, StatusProducao } from "@/types";

const FILTROS: { id: StatusProducao | ""; nome: string }[] = [
  { id: "", nome: "Todos" },
  { id: "NOVO", nome: "Novo" },
  { id: "EM_PRODUCAO", nome: "Em produção" },
  { id: "PRONTO", nome: "Pronto" },
  { id: "ENVIADO", nome: "Enviado" },
  { id: "ENTREGUE", nome: "Entregue" },
];

const PERIODOS = [
  { id: "7", nome: "Últimos 7 dias" },
  { id: "30", nome: "Últimos 30 dias" },
  { id: "0", nome: "Todo o período" },
];

const PROXIMO_STATUS: Partial<Record<ProximaAcaoPedido, StatusProducao>> = {
  ACEITAR: "EM_PRODUCAO",
  MARCAR_PRONTO: "PRONTO",
  INFORMAR_RASTREIO: "ENVIADO",
};

function dentroDoPeriodo(criadoEm: string, dias: number) {
  if (!dias) return true;
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  return new Date(criadoEm).getTime() >= limite;
}

export default function PedidosArtesao() {
  const { valor: filtroStatus, definir: definirStatus } = useFiltroUrl("status");
  const { valor: filtroPeriodo, definir: definirPeriodo } = useFiltroUrl("periodo");
  const status = FILTROS.find((item) => item.id === filtroStatus)?.id || undefined;
  const { dados, carregando, erro, recarregar } = usePedidosArtesao(status);
  const { atualizarPedido, salvando, erro: erroDeAcao } = useAcoesArtesao();

  const [rastreio, setRastreio] = useState<Record<string, string>>({});
  const [expandido, setExpandido] = useState<string | null>(null);

  const dias = filtroPeriodo === "" ? 30 : Number(filtroPeriodo);
  const pedidos = (dados?.pedidosRecebidos ?? []).filter(
    (pedido) =>
      dentroDoPeriodo(pedido.criadoEm, dias) && (!status || pedido.statusProducao === status),
  );

  function abrir(acao: ProximaAcaoPedido, pedido: PedidoRecebido) {
    if (acao === "INFORMAR_RASTREIO") {
      setExpandido(expandido === pedido.id ? null : pedido.id);
      setRastreio((atual) => ({
        ...atual,
        [pedido.id]: atual[pedido.id] ?? "",
      }));
      return;
    }
    if (acao === "VER_RASTREIO") {
      setExpandido(expandido === pedido.id ? null : pedido.id);
      return;
    }
    const proximo = PROXIMO_STATUS[acao];
    if (!proximo) return;
    void atualizarPedido(pedido.id, proximo, undefined, () => {
      toaster.create({
        type: "success",
        title: `Pedido #${pedido.id} atualizado`,
        description: `Agora está ${ROTULO_STATUS[proximo].toLowerCase()}.`,
      });
      recarregar();
    }).catch(() => {});
  }

  async function salvarRastreio(pedido: PedidoRecebido) {
    const codigo = (rastreio[pedido.id] ?? "").trim();
    if (!codigo) return;
    await atualizarPedido(pedido.id, "ENVIADO", codigo, () => {
      setExpandido(null);
      toaster.create({
        type: "success",
        title: "Rastreio salvo",
        description: `O código ${codigo} foi enviado para ${pedido.comprador.nome}.`,
      });
      recarregar();
    }).catch(() => {});
  }

  async function copiarRastreio(pedido: PedidoRecebido) {
    if (!pedido.codigoRastreio) return;
    try {
      await navigator.clipboard.writeText(pedido.codigoRastreio);
      toaster.create({ type: "success", title: "Código copiado" });
    } catch {
      toaster.create({
        type: "error",
        title: "Não foi possível copiar",
        description: `Anote o código: ${pedido.codigoRastreio}`,
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Do ateliê para o Brasil"
        titulo="Pedidos"
        descricao="Aceite, produza e acompanhe cada peça que sai do seu ateliê."
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((item) => {
            const ativo = filtroStatus === item.id;
            return (
              <button
                key={item.id || "todos"}
                type="button"
                aria-pressed={ativo}
                onClick={() => definirStatus(item.id ?? "")}
                className={`inline-flex h-9 items-center rounded-full px-3 text-apoio font-bold transition-colors duration-150 ${
                  ativo
                    ? "bg-terracota text-white"
                    : "border border-borda bg-superficie text-tinta-2 hover:border-borda-forte hover:text-tinta"
                }`}
              >
                {item.nome}
              </button>
            );
          })}
        </div>
        <div className="lg:w-56">
          <Selecao
            id="periodo-pedidos"
            rotulo="Período"
            compacto
            value={filtroPeriodo || "30"}
            opcoes={PERIODOS}
            onChange={(evento) => definirPeriodo(evento.target.value)}
          />
        </div>
      </div>

      {erroDeAcao ? (
        <p role="alert" className="text-apoio text-erro">
          {erroDeAcao.message}
        </p>
      ) : null}

      {carregando ? (
        <ul className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, indice) => (
            <li key={indice}>
              <Esqueleto className="h-32" />
            </li>
          ))}
        </ul>
      ) : erro ? (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      ) : pedidos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum pedido por aqui"
          descricao={
            status
              ? `Você não tem pedido em "${ROTULO_STATUS[status].toLowerCase()}" no período escolhido.`
              : "Quando alguém comprar uma peça sua, o pedido aparece nesta lista."
          }
          acao={
            status || filtroPeriodo ? (
              <Botao
                variante="contorno"
                onClick={() => {
                  definirStatus("");
                  definirPeriodo("");
                }}
              >
                Limpar filtros
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-apoio text-tinta-2">
            {plural(pedidos.length, "pedido", "pedidos")} no período
          </p>
          <ul className="flex flex-col gap-4">
            {pedidos.map((pedido) => {
              const aberto = expandido === pedido.id;
              return (
                <li key={pedido.id}>
                  <PedidoArtesaoCard
                    pedido={pedido}
                    aberto={aberto}
                    codigoRastreio={rastreio[pedido.id] ?? ""}
                    salvando={salvando === `pedido:${pedido.id}`}
                    aoAbrir={abrir}
                    aoAlterarRastreio={(pedidoId, codigo) =>
                      setRastreio((atual) => ({ ...atual, [pedidoId]: codigo }))
                    }
                    aoSalvarRastreio={salvarRastreio}
                    aoCancelarRastreio={() => setExpandido(null)}
                    aoCopiarRastreio={copiarRastreio}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
