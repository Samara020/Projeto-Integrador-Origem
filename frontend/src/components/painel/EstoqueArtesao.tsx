"use client";

import { useState } from "react";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Campo } from "@/components/ui/Campo";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Foto } from "@/components/ui/Foto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Selo } from "@/components/ui/Selo";
import { useAcoesArtesao, usePecasArtesao } from "@/hooks/usePainelArtesao";
import { plural } from "@/lib/formato";
import type { PecaEstoque, SituacaoPeca } from "@/types";

const FILTROS: { id: SituacaoPeca | ""; nome: string }[] = [
  { id: "", nome: "Todos" },
  { id: "ATIVO", nome: "Ativos" },
  { id: "INATIVO", nome: "Inativos" },
  { id: "ESGOTADO", nome: "Esgotados" },
  { id: "ESTOQUE_BAIXO", nome: "Estoque baixo" },
];

const ROTULO_SITUACAO: Record<SituacaoPeca, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ESGOTADO: "Esgotado",
  ESTOQUE_BAIXO: "Estoque baixo",
};

const VARIANTE_SITUACAO: Record<SituacaoPeca, "sucesso" | "neutro" | "erro" | "aviso"> = {
  ATIVO: "sucesso",
  INATIVO: "neutro",
  ESGOTADO: "erro",
  ESTOQUE_BAIXO: "aviso",
};

export default function EstoqueArtesao() {
  const { valor: filtro, definir } = useFiltroUrl("situacao");
  const filtroValido = FILTROS.some((item) => item.id === filtro);
  const situacao = (filtroValido && filtro !== "" ? filtro : undefined) as SituacaoPeca | undefined;
  const filtroAtivo = filtroValido ? filtro : "";

  const { dados, carregando, erro, recarregar } = usePecasArtesao(situacao);
  const { alterarEstoque, removerPeca, salvando, erro: erroDeAcao, limparErro } = useAcoesArtesao();

  const [editando, setEditando] = useState<string | null>(null);
  const [novoEstoque, setNovoEstoque] = useState("");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const contagem = dados?.contagem;
  const pecas = dados?.itens ?? [];

  function contagemDe(id: SituacaoPeca | "") {
    if (!id) {
      if (!contagem) return 0;
      return (
        (contagem.ATIVO ?? 0) +
        (contagem.INATIVO ?? 0) +
        (contagem.ESGOTADO ?? 0) +
        (contagem.ESTOQUE_BAIXO ?? 0)
      );
    }
    return contagem?.[id] ?? 0;
  }

  function abrirAjuste(peca: PecaEstoque) {
    limparErro();
    setErroValidacao(null);
    setEditando(peca.id);
    setConfirmando(null);
    setNovoEstoque(String(peca.estoque));
  }

  function fecharAjuste() {
    setEditando(null);
    setErroValidacao(null);
    limparErro();
  }

  function abrirExclusao(peca: PecaEstoque) {
    limparErro();
    setErroValidacao(null);
    setConfirmando(peca.id);
    setEditando(null);
  }

  function fecharExclusao() {
    setConfirmando(null);
    limparErro();
  }

  async function salvarAjuste(peca: PecaEstoque) {
    const valorTrimmed = novoEstoque.trim();
    if (valorTrimmed === "") {
      setErroValidacao("Informe a quantidade em estoque.");
      return;
    }
    const quantidade = Number(valorTrimmed);
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      setErroValidacao("A quantidade deve ser um número inteiro maior ou igual a zero.");
      return;
    }

    limparErro();
    setErroValidacao(null);

    try {
      await alterarEstoque(peca.id, quantidade, undefined, () => {
        setEditando((atual) => (atual === peca.id ? null : atual));
        recarregar();
      });
    } catch {
      // Erro exibido na UI via erroDeAcao
    }
  }

  async function alternarPausa(peca: PecaEstoque) {
    limparErro();
    try {
      await alterarEstoque(
        peca.id,
        peca.estoque,
        peca.situacao !== "INATIVO",
        recarregar,
      );
    } catch {
      // Erro exibido na UI via erroDeAcao
    }
  }

  async function confirmarExclusao(peca: PecaEstoque) {
    limparErro();
    try {
      await removerPeca(peca.id, () => {
        setConfirmando((atual) => (atual === peca.id ? null : atual));
        recarregar();
      });
    } catch {
      // Erro exibido na UI via erroDeAcao
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        sobretitulo="Peças e disponibilidade"
        titulo="Gestão de estoque"
        descricao="Cada peça que você publica aparece aqui. Pause quando faltar material e volte a expor quando der."
        acoes={
          <BotaoLink href="/painel/artesao/pecas/nova" variante="primario">
            Cadastrar peça
          </BotaoLink>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((item) => {
          const ativo = filtroAtivo === item.id;
          return (
            <button
              key={item.id || "todos"}
              type="button"
              aria-pressed={ativo}
              onClick={() => {
                limparErro();
                setErroValidacao(null);
                definir(item.id ?? "");
              }}
              className={`inline-flex min-h-[40px] h-10 items-center rounded-full px-3 text-apoio font-bold transition-colors duration-150 ${
                ativo
                  ? "bg-terracota text-white"
                  : "border border-borda bg-superficie text-tinta-2 hover:border-borda-forte hover:text-tinta"
              }`}
            >
              {item.nome} {contagemDe(item.id)}
            </button>
          );
        })}
      </div>

      {erroValidacao ? (
        <p role="alert" className="text-apoio text-erro">
          {erroValidacao}
        </p>
      ) : null}

      {erroDeAcao ? (
        <p role="alert" className="text-apoio text-erro">
          {erroDeAcao.message}
        </p>
      ) : null}

      {carregando ? (
        <Cartao>
          <ul className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, indice) => (
              <li key={indice} className="flex items-center gap-4">
                <Esqueleto className="size-14" />
                <div className="flex-1">
                  <Esqueleto className="h-4 w-48" />
                  <Esqueleto className="mt-2 h-3 w-24" />
                </div>
                <Esqueleto className="h-4 w-10" />
                <Esqueleto className="h-6 w-24" />
              </li>
            ))}
          </ul>
        </Cartao>
      ) : erro ? (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      ) : pecas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma peça com esse filtro"
          descricao={
            situacao
              ? `Você não tem peça em "${ROTULO_SITUACAO[situacao].toLowerCase()}" agora.`
              : "Cadastre a primeira peça para ela aparecer na vitrine da Origem."
          }
          acao={
            situacao ? (
              <Botao variante="contorno" onClick={() => definir("")}>
                Ver todas as peças
              </Botao>
            ) : (
              <BotaoLink href="/painel/artesao/pecas/nova" variante="primario">
                Cadastrar peça
              </BotaoLink>
            )
          }
        />
      ) : (
        <Cartao className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">
                {pecas.length} {plural(pecas.length, "peça", "peças")} no seu ateliê
              </caption>
              <thead>
                <tr className="border-b border-borda text-apoio tracking-wide text-tinta-3 uppercase">
                  <th scope="col" className="px-5 py-3 font-bold">
                    Produto
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    SKU
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    Estoque
                  </th>
                  <th scope="col" className="px-5 py-3 font-bold">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-bold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pecas.map((peca) => {
                  const aberta = editando === peca.id;
                  const excluir = confirmando === peca.id;
                  return [
                    <tr
                      key={peca.id}
                      className={`border-b border-borda last:border-0 ${
                        peca.situacao === "ESTOQUE_BAIXO" ? "bg-areia/40" : ""
                      }`}
                    >
                      <th scope="row" className="px-5 py-4">
                        <span className="flex items-center gap-3">
                          <Foto
                            src={peca.imagemPrincipal}
                            alt=""
                            width={56}
                            height={56}
                            className="size-14 rounded-raio object-cover"
                          />
                          <span className="font-lora text-tinta">{peca.nome}</span>
                        </span>
                      </th>
                      <td className="px-5 py-4 text-apoio text-tinta-2">{peca.sku}</td>
                      <td className="px-5 py-4 font-lora text-lg tabular-nums text-tinta">
                        {peca.estoque}
                      </td>
                      <td className="px-5 py-4">
                        <Selo variante={VARIANTE_SITUACAO[peca.situacao]}>
                          {ROTULO_SITUACAO[peca.situacao]}
                        </Selo>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-3 text-apoio">
                          <Botao
                            variante="fantasma"
                            onClick={() => (aberta ? fecharAjuste() : abrirAjuste(peca))}
                            aria-expanded={aberta}
                          >
                            Ajustar estoque
                          </Botao>
                          <Botao
                            variante="fantasma"
                            onClick={() => alternarPausa(peca)}
                            carregando={salvando === `pausa:${peca.id}`}
                          >
                            {peca.situacao === "INATIVO" ? "Retomar" : "Pausar"}
                          </Botao>
                          <Botao
                            variante="fantasma"
                            onClick={() => (excluir ? fecharExclusao() : abrirExclusao(peca))}
                            aria-expanded={excluir}
                          >
                            Excluir
                          </Botao>
                        </div>
                      </td>
                    </tr>,
                    ...(aberta || excluir
                      ? [
                          <tr
                            key={`${peca.id}-editor`}
                            className="border-b border-borda last:border-0"
                          >
                            <td colSpan={5} className="bg-superficie-2 px-5 py-4">
                              {aberta ? (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                  <div className="sm:w-40">
                                    <Campo
                                      id={`estoque-${peca.id}`}
                                      rotulo="Quantidade em estoque"
                                      type="number"
                                      min={0}
                                      step={1}
                                      inputMode="numeric"
                                      value={novoEstoque}
                                      onChange={(evento) => {
                                        setNovoEstoque(evento.target.value);
                                        if (erroValidacao) setErroValidacao(null);
                                      }}
                                      dica="Zero deixa a peça esgotada."
                                    />
                                  </div>
                                  <div className="flex gap-2 sm:pt-7">
                                    <Botao
                                      onClick={() => salvarAjuste(peca)}
                                      carregando={salvando === `ajuste:${peca.id}`}
                                    >
                                      Salvar
                                    </Botao>
                                    <Botao variante="secundario" onClick={fecharAjuste}>
                                      Cancelar
                                    </Botao>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <p className="text-apoio text-tinta">
                                    Excluir “{peca.nome}” da vitrine? A peça sai do catálogo e do
                                    painel.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Botao
                                      variante="contorno"
                                      onClick={() => confirmarExclusao(peca)}
                                      carregando={salvando === `remover:${peca.id}`}
                                    >
                                      Sim, excluir
                                    </Botao>
                                    <Botao
                                      variante="secundario"
                                      onClick={fecharExclusao}
                                    >
                                      Cancelar
                                    </Botao>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>,
                        ]
                      : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}
    </div>
  );
}
