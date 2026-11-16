"use client";

import { useState } from "react";
import { Cartao } from "@/components/painel/CartaoPainel";
import { Botao } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { toaster } from "@/components/ui/toaster";
import { usePedidosArtesao } from "@/hooks/usePainelArtesao";

export default function RastreioEtiqueta() {
  const { dados: pedidos } = usePedidosArtesao();
  const [rastreio, setRastreio] = useState("");
  const pedidoParaEnvio = (pedidos?.pedidosRecebidos ?? []).find(
    (pedido) => pedido.codigoRastreio && pedido.statusProducao === "ENVIADO",
  );

  function imprimirEtiqueta() {
    if (!rastreio.trim()) {
      toaster.create({
        type: "error",
        title: "Falta o código",
        description: "Informe o código antes de imprimir a etiqueta.",
      });
      return;
    }

    window.print();
  }

  function usarCodigoDoPedido() {
    setRastreio(pedidoParaEnvio?.codigoRastreio ?? "");
    toaster.create({ type: "success", title: "Código preenchido" });
  }

  return (
    <Cartao
      titulo="Código de rastreio e etiqueta"
      descricao="Informe o código e imprima a etiqueta para colar na embalagem."
    >
      {pedidoParaEnvio ? (
        <div className="flex flex-col gap-4">
          <p className="text-apoio text-tinta-2">
            Pedido <span className="font-bold text-terracota">#{pedidoParaEnvio.id}</span> ·{" "}
            {pedidoParaEnvio.comprador.nome}
          </p>
          <Campo
            id="codigo-rastreio"
            rotulo="Código de rastreio"
            value={rastreio}
            onChange={(evento) => setRastreio(evento.target.value)}
            placeholder={pedidoParaEnvio.codigoRastreio ?? "BR458012973RG"}
            dica="Preenchido com o código que você já informou na tela de pedidos."
          />
          <div className="flex flex-wrap gap-2">
            <Botao onClick={imprimirEtiqueta}>Imprimir etiqueta</Botao>
            <Botao variante="secundario" onClick={usarCodigoDoPedido}>
              Usar código do pedido
            </Botao>
          </div>
        </div>
      ) : (
        <p className="text-apoio text-tinta-2">
          Nenhum pedido com rastreio enviado. Assim que você marcar um pedido como enviado, a
          etiqueta aparece aqui.
        </p>
      )}
    </Cartao>
  );
}
