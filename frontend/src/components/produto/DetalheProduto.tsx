"use client";

import { Check, PencilRuler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Avaliacoes } from "@/components/produto/Avaliacoes";
import { BotaoComparar } from "@/components/produto/BotaoComparar";
import { Galeria } from "@/components/produto/Galeria";
import { Recomendados } from "@/components/produto/Recomendados";
import { SeletorQuantidade } from "@/components/produto/SeletorQuantidade";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Estrelas } from "@/components/ui/Estrelas";
import { Selo } from "@/components/ui/Selo";
import { toaster } from "@/components/ui/toaster";
import { useCarrinho } from "@/hooks/useCarrinho";
import { registrarVisita } from "@/hooks/useHistorico";
import { useProduto } from "@/hooks/useProdutos";
import { formatarMoeda, formatarNota, plural } from "@/lib/formato";
import type { Disponibilidade, ModalidadeProducao, ProdutoDetalhe } from "@/types";

const MODALIDADES: Record<ModalidadeProducao, string> = {
  PECA_UNICA: "Peça única",
  PRONTA_ENTREGA: "Pronta entrega",
  SOB_ENCOMENDA: "Sob encomenda",
};

const DISPONIBILIDADES: Record<Disponibilidade, { texto: string; cor: string }> = {
  DISPONIVEL: { texto: "Disponível", cor: "text-selo" },
  RESERVADO: { texto: "Reservada por outra pessoa", cor: "text-tinta-2" },
  VENDIDO: { texto: "Vendida", cor: "text-erro" },
};

function Carregando() {
  return (
    <div
      className="grid gap-8 md:grid-cols-2"
      role="status"
      aria-label="Carregando peça"
    >
      <Esqueleto className="aspect-4/3 w-full" />
      <div className="flex flex-col gap-4">
        <Esqueleto className="h-6 w-40" />
        <Esqueleto className="h-10 w-3/4" />
        <Esqueleto className="h-8 w-32" />
        <Esqueleto className="h-24 w-full" />
        <Esqueleto className="h-11 w-full" />
      </div>
    </div>
  );
}

function Compra({ produto }: { produto: ProdutoDetalhe }) {
  const router = useRouter();
  const { adicionar } = useCarrinho();
  const [quantidade, setQuantidade] = useState(1);
  const [acao, setAcao] = useState<"adicionar" | "comprar" | null>(null);

  const disponivel = produto.disponibilidade === "DISPONIVEL";
  const status = DISPONIBILIDADES[produto.disponibilidade];

  async function colocarNoCarrinho(destino: "adicionar" | "comprar") {
    setAcao(destino);
    try {
      await adicionar(produto, quantidade);
      if (destino === "comprar") {
        router.push("/carrinho");
        return;
      }
      toaster.create({
        type: "success",
        title: "Peça no carrinho",
        description: `${plural(quantidade, "unidade", "unidades")} de ${produto.nome}`,
      });
    } catch {
      toaster.create({
        type: "error",
        title: "Não deu para adicionar",
        description: "Tente de novo em instantes.",
      });
    }
    setAcao(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-apoio">
        <div className="flex gap-2">
          <dt className="text-tinta-3">Técnica</dt>
          <dd className="font-medium text-tinta">{produto.tecnica.nome}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-tinta-3">Origem</dt>
          <dd className="font-medium text-tinta">{produto.regiao.nome}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="sr-only">Disponibilidade</dt>
          <dd className={`font-bold ${status.cor}`}>{status.texto}</dd>
        </div>
      </dl>

      {disponivel ? (
        <div className="flex flex-wrap items-center gap-3">
          {produto.estoque > 1 && (
            <SeletorQuantidade
              valor={quantidade}
              maximo={produto.estoque}
              aoMudar={setQuantidade}
            />
          )}
          <Botao
            carregando={acao === "comprar"}
            disabled={acao !== null}
            onClick={() => void colocarNoCarrinho("comprar")}
          >
            Comprar agora
          </Botao>
          <Botao
            variante="contorno"
            carregando={acao === "adicionar"}
            disabled={acao !== null}
            onClick={() => void colocarNoCarrinho("adicionar")}
          >
            Adicionar ao carrinho
          </Botao>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-raio border border-borda bg-superficie p-4">
          <p className="text-apoio text-tinta-2">
            Esta peça não pode ser comprada agora. Há outras de{" "}
            {produto.artesao.nome} e da mesma técnica no catálogo.
          </p>
          <BotaoLink
            href={`/catalogo?tecnica=${produto.tecnica.id}`}
            variante="contorno"
          >
            Ver peças de {produto.tecnica.nome.toLowerCase()}
          </BotaoLink>
        </div>
      )}
    </div>
  );
}

export function DetalheProduto({ id }: { id: string }) {
  const { dados: produto, carregando, erro, recarregar } = useProduto(id);

  // O dado chega no cliente, então o título da aba é ajustado aqui.
  useEffect(() => {
    if (!produto) return;
    document.title = `${produto.nome} · Origem`;
    registrarVisita({
      id: produto.id,
      nome: produto.nome,
      artesaoId: produto.artesao.id,
      artesaoNome: produto.artesao.nome,
      regiaoId: produto.regiao.id,
      regiaoNome: produto.regiao.nome,
      tecnicaId: produto.tecnica.id,
      tecnicaNome: produto.tecnica.nome,
    });
  }, [produto]);

  return (
    <Container className="flex flex-col gap-secao py-secao">
      {carregando && <Carregando />}

      {erro?.status === 404 && (
        <EstadoVazio
          titulo="Não encontramos essa peça"
          descricao="Ela pode ter sido vendida ou retirada pelo artesão."
          acao={<BotaoLink href="/catalogo">Voltar para o catálogo</BotaoLink>}
        />
      )}
      {erro && erro.status !== 404 && (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      )}

      {produto && (
        <>
          <article className="grid gap-8 md:grid-cols-2 lg:gap-12">
            <Galeria imagens={produto.imagens} nome={produto.nome} />

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Selo variante="destaque">
                  {MODALIDADES[produto.modalidadeProducao]}
                </Selo>
                {produto.seloAtivo && (
                  <Selo variante="sucesso">
                    <Check className="size-3" aria-hidden="true" />
                    Autenticidade validada
                  </Selo>
                )}
              </div>

              <h1 className="font-titulo text-h1 font-bold text-tinta">
                {produto.nome}
              </h1>
              <p className="text-h1 font-bold tabular-nums text-terracota">
                {formatarMoeda(produto.preco)}
              </p>
              <p className="text-apoio text-tinta-3">
                por{" "}
                <Link
                  href={`/artesao/${produto.artesao.id}`}
                  className="font-medium text-tinta underline-offset-2 hover:underline"
                >
                  {produto.artesao.loja}
                </Link>{" "}
                · {produto.artesao.cidade}
              </p>

              {produto.totalAvaliacoes > 0 && (
                <Link
                  href={`/produto/${produto.id}/avaliacoes`}
                  className="flex items-center gap-2 self-start text-apoio text-tinta-2 hover:underline"
                >
                  <Estrelas nota={produto.avaliacaoMedia} />
                  {formatarNota(produto.avaliacaoMedia)} ·{" "}
                  {plural(produto.totalAvaliacoes, "avaliação", "avaliações")}
                </Link>
              )}

              <p className="text-corpo text-tinta-2">{produto.descricao}</p>

              <Compra produto={produto} />
              {produto.modalidadeProducao === "SOB_ENCOMENDA" &&
                produto.disponibilidade === "DISPONIVEL" && (
                  <BotaoLink
                    href={`/produto/${produto.id}/personalizar`}
                    variante="secundario"
                    className="self-start"
                  >
                    <PencilRuler className="size-4" aria-hidden="true" />
                    Personalizar esta peça
                  </BotaoLink>
                )}
              <BotaoComparar produtoId={produto.id} />
            </div>
          </article>

          <Avaliacoes produtoId={produto.id} />
          <Recomendados produtoId={produto.id} />
        </>
      )}
    </Container>
  );
}
