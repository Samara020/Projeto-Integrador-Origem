import { Cartao } from "@/components/painel/CartaoPainel";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { formatarData, formatarMoeda } from "@/lib/formato";
import type { PedidoRecebido, ProximaAcaoPedido, StatusProducao } from "@/types";

export const ROTULO_STATUS: Record<StatusProducao, string> = {
  NOVO: "Novo",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const VARIANTE_STATUS: Record<
  StatusProducao,
  "sucesso" | "neutro" | "destaque" | "aviso" | "erro"
> = {
  NOVO: "destaque",
  EM_PRODUCAO: "aviso",
  PRONTO: "sucesso",
  ENVIADO: "neutro",
  ENTREGUE: "neutro",
  CANCELADO: "erro",
};

const ROTULO_ACAO: Record<ProximaAcaoPedido, string> = {
  ACEITAR: "Aceitar pedido",
  MARCAR_PRONTO: "Marcar como pronto",
  INFORMAR_RASTREIO: "Informar rastreio",
  VER_RASTREIO: "Ver rastreio",
  NENHUMA: "",
};

type PedidoArtesaoCardProps = {
  pedido: PedidoRecebido;
  aberto: boolean;
  codigoRastreio: string;
  salvando: boolean;
  aoAbrir: (acao: ProximaAcaoPedido, pedido: PedidoRecebido) => void;
  aoAlterarRastreio: (pedidoId: string, codigo: string) => void;
  aoSalvarRastreio: (pedido: PedidoRecebido) => void;
  aoCancelarRastreio: () => void;
  aoCopiarRastreio: (pedido: PedidoRecebido) => void;
};

export function PedidoArtesaoCard({
  pedido,
  aberto,
  codigoRastreio,
  salvando,
  aoAbrir,
  aoAlterarRastreio,
  aoSalvarRastreio,
  aoCancelarRastreio,
  aoCopiarRastreio,
}: PedidoArtesaoCardProps) {
  return (
    <Cartao>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-apoio font-bold text-terracota">#{pedido.id}</p>
            <Selo variante={VARIANTE_STATUS[pedido.statusProducao]}>
              {ROTULO_STATUS[pedido.statusProducao]}
            </Selo>
          </div>
          <p className="text-apoio text-tinta-3">
            {formatarData(pedido.criadoEm)} · {pedido.comprador.nome} · {pedido.comprador.local}
          </p>
          <ul className="flex flex-col gap-1">
            {pedido.itens.map((item) => (
              <li key={item.produtoId} className="text-corpo text-tinta">
                {item.nome} <span className="text-tinta-2">× {item.quantidade}</span>
              </li>
            ))}
          </ul>
          <p className="font-lora text-lg text-tinta">{formatarMoeda(pedido.valorTotal)}</p>
        </div>

        {pedido.proximaAcao === "NENHUMA" ? (
          <p className="text-apoio text-tinta-3">
            {pedido.statusProducao === "ENTREGUE"
              ? "Pedido entregue. Obrigado!"
              : "Nenhuma ação necessária."}
          </p>
        ) : (
          <Botao
            variante={pedido.proximaAcao === "INFORMAR_RASTREIO" ? "primario" : "contorno"}
            onClick={() => aoAbrir(pedido.proximaAcao, pedido)}
            carregando={salvando}
            aria-expanded={aberto}
          >
            {ROTULO_ACAO[pedido.proximaAcao]}
          </Botao>
        )}
      </div>

      {aberto ? (
        <div className="mt-4 border-t border-borda pt-4">
          {pedido.proximaAcao === "INFORMAR_RASTREIO" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="sm:w-72">
                <Campo
                  id={`rastreio-${pedido.id}`}
                  rotulo="Código de rastreio"
                  value={codigoRastreio}
                  onChange={(evento) => aoAlterarRastreio(pedido.id, evento.target.value)}
                  placeholder="BR458012973RG"
                  dica="A transportadora informa esse código."
                />
              </div>
              <div className="flex gap-2 sm:pt-7">
                <Botao
                  onClick={() => aoSalvarRastreio(pedido)}
                  carregando={salvando}
                  disabled={!codigoRastreio.trim()}
                >
                  Salvar rastreio
                </Botao>
                <Botao variante="secundario" onClick={aoCancelarRastreio}>
                  Cancelar
                </Botao>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-corpo text-tinta">
                Código do pedido #{pedido.id}:{" "}
                <span className="font-bold">{pedido.codigoRastreio ?? "—"}</span>
              </p>
              <Botao
                variante="fantasma"
                onClick={() => aoCopiarRastreio(pedido)}
                disabled={!pedido.codigoRastreio}
              >
                Copiar código
              </Botao>
            </div>
          )}
        </div>
      ) : null}
    </Cartao>
  );
}
