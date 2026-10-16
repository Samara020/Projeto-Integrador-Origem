// Fake API: pedidos no localStorage, pelo mesmo motivo do carrinho.
// Assinatura do backend: ContratoDeAPI.md, 2.6 e 2.7.
import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import { carrinhoService } from "@/services/carrinho";
import type {
  Carrinho,
  EnderecoEntrega,
  OpcaoEnvio,
  PedidoCriado,
  PedidoResumo,
  RespostaPedidos,
} from "@/types";

const CHAVE = "pedidos";
const CHAVE_TENTATIVA = "tentativa-compra-demo";
const API_CONCORRENCIA = process.env.NEXT_PUBLIC_CONCORRENCIA_API_URL;
const PRODUTO_DEMONSTRACAO = "prd_201";
const ENVIO_PADRAO: OpcaoEnvio = {
  id: "economico",
  nome: "Econômico",
  prazo: "7 a 10 dias úteis",
  valor: 18,
};

type TentativaCompra = { id: string; assinaturaCarrinho: string };
let tentativaEmMemoria: TentativaCompra | null = null;

function idDaTentativa(carrinho: Carrinho, usuario: string): string {
  const itens = carrinho.itens
    .map(({ produtoId, quantidade }) => ({ produtoId, quantidade }))
    .sort((a, b) => a.produtoId.localeCompare(b.produtoId));
  const assinaturaCarrinho = JSON.stringify({ usuario, itens });
  const anterior = lerLocal<TentativaCompra>(CHAVE_TENTATIVA) ?? tentativaEmMemoria;
  if (anterior?.assinaturaCarrinho === assinaturaCarrinho && anterior.id) {
    tentativaEmMemoria = anterior;
    return anterior.id;
  }

  const id = crypto.randomUUID();
  tentativaEmMemoria = { id, assinaturaCarrinho };
  gravarLocal(CHAVE_TENTATIVA, tentativaEmMemoria);
  return id;
}

export const pedidosService = {
  opcaoEnvioPadrao(): OpcaoEnvio {
    return ENVIO_PADRAO;
  },

  // POST /pedidos/checkout
  async checkout(endereco: EnderecoEntrega): Promise<PedidoCriado> {
    const carrinho = await carrinhoService.obter();
    if (carrinho.itens.length === 0) {
      throw new ApiError(400, "Seu carrinho está vazio.");
    }
    if (!endereco.cep || !endereco.rua || !endereco.numero) {
      throw new ApiError(400, "Preencha o endereço de entrega.");
    }

    const itemDemonstracao = carrinho.itens.find(
      (item) => item.produtoId === PRODUTO_DEMONSTRACAO,
    );
    let pedidoId: string | undefined;
    if (itemDemonstracao) {
      if (!API_CONCORRENCIA) {
        throw new ApiError(503, "Configure a API de concorrência para comprar esta peça.");
      }

      const usuario = authService.sessaoAtual()?.usuario.id ?? "visitante";
      const compra = await http<{ pedidoId: string; estoque: number }>("/demo/compras", {
        metodo: "POST",
        baseUrl: API_CONCORRENCIA,
        corpo: {
          tentativaId: idDaTentativa(carrinho, usuario),
          usuario,
          produtoId: itemDemonstracao.produtoId,
          quantidade: itemDemonstracao.quantidade,
        },
      });
      if (!compra.pedidoId) {
        throw new ApiError(502, "A API não retornou o identificador do pedido.");
      }
      pedidoId = compra.pedidoId;
    }

    const pedido: PedidoResumo = {
      id: pedidoId ?? `ped_${Date.now().toString().slice(-6)}`,
      status: "AGUARDANDO_PAGAMENTO",
      valorTotal: carrinho.valorTotal + ENVIO_PADRAO.valor,
      criadoEm: new Date().toISOString(),
      itens: carrinho.itens,
    };
    const anteriores = lerLocal<PedidoResumo[]>(CHAVE) ?? [];
    if (!anteriores.some((anterior) => anterior.id === pedido.id)) {
      gravarLocal(CHAVE, [pedido, ...anteriores]);
    }
    return {
      pedidoId: pedido.id,
      status: pedido.status,
      valorTotal: pedido.valorTotal,
    };
  },

  encerrarTentativaDemonstracao(): void {
    tentativaEmMemoria = null;
    apagarLocal(CHAVE_TENTATIVA);
  },

  // GET /comprador/pedidos
  async listar(): Promise<RespostaPedidos> {
    return {
      pedidos: (lerLocal<PedidoResumo[]>(CHAVE) ?? []).map((pedido) => ({
        ...pedido,
        itens: pedido.itens ?? [],
      })),
    };
  },
};
