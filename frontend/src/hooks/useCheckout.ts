"use client";

import { useState } from "react";
import { useCarrinho } from "@/hooks/useCarrinho";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type {
  DadosPagamento,
  EnderecoEntrega,
  PagamentoProcessado,
  PedidoCriado,
} from "@/types";

export function useCheckout() {
  const carrinho = useCarrinho();
  const [pedido, setPedido] = useState<PedidoCriado | null>(null);
  const [pagamento, setPagamento] = useState<PagamentoProcessado | null>(null);

  async function criarPedido(endereco: EnderecoEntrega) {
    const criado = await pedidosService.checkout(endereco);
    setPedido(criado);
    return criado;
  }

  async function pagar(dados: Omit<DadosPagamento, "pedidoId">) {
    if (!pedido) throw new Error("Crie o pedido antes de pagar.");
    const processado = await pagamentosService.processar({
      ...dados,
      pedidoId: pedido.pedidoId,
    });
    if (processado.status === "APROVADO") {
      await carrinho.esvaziar();
      pedidosService.encerrarTentativaDemonstracao();
    }
    setPagamento(processado);
    return processado;
  }

  return {
    ...carrinho,
    opcaoEnvio: pedidosService.opcaoEnvioPadrao(),
    pedido,
    pagamento,
    criarPedido,
    pagar,
  };
}
