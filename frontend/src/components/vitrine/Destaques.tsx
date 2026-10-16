"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  ProdutoGrade,
  ProdutoGradeEsqueleto,
} from "@/components/produto/ProdutoGrade";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useComparacao } from "@/hooks/useComparacao";
import { useDestaques } from "@/hooks/useProdutos";

export function Destaques() {
  const { dados, carregando, erro, recarregar } = useDestaques();
  const comparacao = useComparacao();

  return (
    <section aria-labelledby="destaques-titulo" className="py-secao">
      <Container className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="destaques-titulo"
              className="font-titulo text-h2 font-bold text-tinta"
            >
              Peças que contam <span className="text-terracota">histórias</span>
            </h2>
            <p className="text-apoio text-tinta-3">
              Escolhidas pela equipe, feitas à mão em Pernambuco.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {comparacao.ids.length > 0 && (
              <BotaoLink href="/comparar" variante="contorno">
                Comparar seleção ({comparacao.ids.length})
              </BotaoLink>
            )}
            <BotaoLink href="/catalogo" variante="secundario">
              Ver todas
              <ArrowRight className="size-4 text-terracota" aria-hidden="true" />
            </BotaoLink>
          </div>
        </div>

        {carregando && <ProdutoGradeEsqueleto quantidade={4} />}
        {erro && (
          <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
        )}
        {dados && dados.itens.length === 0 && (
          <EstadoVazio
            titulo="Ainda não há destaques"
            descricao="Enquanto a seleção não chega, o catálogo completo está aberto."
            acao={<BotaoLink href="/catalogo">Abrir o catálogo</BotaoLink>}
          />
        )}
        {dados && dados.itens.length > 0 && (
          <ProdutoGrade produtos={dados.itens} />
        )}
      </Container>
    </section>
  );
}
