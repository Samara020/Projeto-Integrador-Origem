"use client";

import { useCallback, useRef, useState } from "react";
import { useCarrinho } from "@/hooks/useCarrinho";
import { ApiError } from "@/lib/http";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type {
  CotacaoFrete,
  DadosPagamento,
  EnderecoEntrega,
  PagamentoProcessado,
  PedidoCriado,
} from "@/types";

export function useCheckout() {
  const carrinho = useCarrinho();
  const [cotacao, setCotacao] = useState<CotacaoFrete | null>(null);
  const [cotandoFrete, setCotandoFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [pedido, setPedido] = useState<PedidoCriado | null>(null);
  const [pagamento, setPagamento] = useState<PagamentoProcessado | null>(null);
  const ultimoCepCotado = useRef<string | null>(null);
  const criandoPedidoRef = useRef(false);

  const limparFrete = useCallback(() => {
    ultimoCepCotado.current = null;
    setCotacao(null);
    setErroFrete(null);
  }, []);

  const cotarFrete = useCallback(
    async (cep: string, forcar = false) => {
      const limpo = cep.replace(/\D/g, "");
      if (limpo.length !== 8) {
        limparFrete();
        return null;
      }
      if (!forcar && ultimoCepCotado.current === limpo && cotacao) {
        return cotacao;
      }

      ultimoCepCotado.current = limpo;
      setCotandoFrete(true);
      setErroFrete(null);
      try {
        const pesoTotal = Math.max(
          0.5,
          carrinho.carrinho.itens.reduce((total, item) => total + item.quantidade * 0.8, 0),
        );
        const resposta = await pedidosService.cotarFrete({
          cep,
          pesoKg: Number(pesoTotal.toFixed(2)),
          dimensoes: { altura: 20, largura: 20, profundidade: 20 },
        });
        setCotacao(resposta);
        return resposta;
      } catch (causa) {
        setCotacao(null);
        setErroFrete(
          causa instanceof ApiError
            ? causa.message
            : "Não foi possível calcular o frete agora.",
        );
        return null;
      } finally {
        setCotandoFrete(false);
      }
    },
    [carrinho.carrinho.itens, cotacao, limparFrete],
  );

  async function criarPedido(endereco: EnderecoEntrega, opcaoEnvioId?: string) {
    if (criandoPedidoRef.current) return pedido;
    criandoPedidoRef.current = true;
    try {
      const criado = await pedidosService.checkout(
        endereco,
        opcaoEnvioId ?? cotacao?.servico.id,
      );
      setPedido(criado);
      return criado;
    } finally {
      criandoPedidoRef.current = false;
    }
  }

  async function pagar(dados: Omit<DadosPagamento, "pedidoId">) {
    if (!pedido) throw new Error("Crie o pedido antes de pagar.");
    const processado = await pagamentosService.processar({
      ...dados,
      pedidoId: pedido.pedidoId,
    });
    if (processado.status === "APROVADO") {
      await carrinho.esvaziar();
    }
    setPagamento(processado);
    return processado;
  }

  return {
    ...carrinho,
    cotacao,
    cotandoFrete,
    erroFrete,
    cotarFrete,
    limparFrete,
    pedido,
    pagamento,
    criarPedido,
    pagar,
  };
}
