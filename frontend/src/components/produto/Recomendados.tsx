"use client";

import {
  ProdutoGrade,
  ProdutoGradeEsqueleto,
} from "@/components/produto/ProdutoGrade";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { useRecomendados } from "@/hooks/useProdutos";

export function Recomendados({ produtoId }: { produtoId: string }) {
  const { dados, carregando, erro, recarregar } = useRecomendados(produtoId);

  // Sem recomendação a seção some: ela é um extra, não o motivo da página.
  if (dados && (!dados.recomendados || dados.recomendados.length === 0)) return null;

  return (
    <section aria-labelledby="recomendados-titulo" className="flex flex-col gap-4">
      <h2
        id="recomendados-titulo"
        className="font-titulo text-h2 font-bold text-tinta"
      >
        Você também pode gostar
      </h2>
      {carregando && <ProdutoGradeEsqueleto quantidade={4} />}
      {erro && <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />}
      {dados && <ProdutoGrade produtos={dados.recomendados ?? []} />}
    </section>
  );
}
