"use client";

import { useRef, useState } from "react";
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
  const criacao = useRef<Promise<PedidoCriado> | null>(null);

  async function criarPedido(endereco: EnderecoEntrega) {
    // Ref trava imediatamente, inclusive antes de React renderizar o botão desabilitado.
    // Após sucesso a mesma etapa reutiliza o pedido; após falha permite tentar novamente.
    if (!criacao.current) {
      criacao.current = pedidosService.checkout(endereco).then((criado) => {
        setPedido(criado);
        return criado;
      }).catch((erro: unknown) => {
        criacao.current = null;
        throw erro;
      });
    }
    return criacao.current;
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
