// Monta as respostas da Fake API no formato do contrato. Só src/app/api importa daqui.
import type {
  ArtesaoPerfil,
  FiltrosProdutos,
  IndicadoresVitrine,
  Paginado,
  ProdutoDetalhe,
  ProdutoResumo,
  RespostaAvaliacoes,
} from "@/types";
import { artesaos } from "./artesaos";
import { avaliacoes } from "./avaliacoes";
import { categorias, regioes, tecnicas } from "./catalogo";
import { produtos, type ProdutoMock } from "./produtos";

export { categorias, regioes, tecnicas };
export { usuarios, SENHA_DEMO, CODIGO_CONVITE_ADMIN } from "./usuarios";

function achar<T extends { id: string }>(lista: T[], id: string): T {
  const item = lista.find((i) => i.id === id);
  if (!item) throw new Error(`Mock inconsistente: id ${id} não existe.`);
  return item;
}

function notasDe(produtoId: string) {
  return avaliacoes.filter((a) => a.produtoId === produtoId);
}

function mediaDe(produtoId: string): number {
  const notas = notasDe(produtoId);
  if (notas.length === 0) return 0;
  const soma = notas.reduce((total, a) => total + a.nota, 0);
  return Math.round((soma / notas.length) * 10) / 10;
}

function paraResumo(p: ProdutoMock): ProdutoResumo {
  const artesao = achar(artesaos, p.artesaoId);
  return {
    id: p.id,
    nome: p.nome,
    preco: p.preco,
    imagemPrincipal: p.imagens[0],
    artesao: { id: artesao.id, nome: artesao.nome },
    seloAtivo: p.seloAtivo,
    regiao: achar(regioes, artesao.regiaoId),
    modalidadeProducao: p.modalidadeProducao,
    disponibilidade: p.disponibilidade,
    avaliacaoMedia: mediaDe(p.id),
  };
}

function paraDetalhe(p: ProdutoMock): ProdutoDetalhe {
  const artesao = achar(artesaos, p.artesaoId);
  return {
    ...paraResumo(p),
    artesao: {
      id: artesao.id,
      nome: artesao.nome,
      loja: artesao.nomeLoja,
      cidade: artesao.cidade,
    },
    descricao: p.descricao,
    imagens: p.imagens,
    categoria: achar(categorias, p.categoriaId),
    tecnica: achar(tecnicas, p.tecnicaId),
    estoque: p.estoque,
    totalAvaliacoes: notasDe(p.id).length,
    dimensoes: p.dimensoes,
    material: p.material,
  };
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function listarProdutos(
  filtros: FiltrosProdutos,
): Paginado<ProdutoResumo> {
  const termo = filtros.termo ? semAcento(filtros.termo.trim()) : "";

  const filtrados = produtos.filter((p) => {
    const artesao = achar(artesaos, p.artesaoId);
    if (termo) {
      const alvo = semAcento(
        [
          p.nome,
          p.descricao,
          artesao.nome,
          artesao.cidade,
          achar(tecnicas, p.tecnicaId).nome,
          achar(categorias, p.categoriaId).nome,
        ].join(" "),
      );
      if (!alvo.includes(termo)) return false;
    }
    if (filtros.categoria && p.categoriaId !== filtros.categoria) return false;
    if (filtros.tecnica && p.tecnicaId !== filtros.tecnica) return false;
    if (filtros.regiao && artesao.regiaoId !== filtros.regiao) return false;
    if (filtros.precoMax !== undefined && p.preco > filtros.precoMax)
      return false;
    if (
      filtros.avaliacaoMin !== undefined &&
      mediaDe(p.id) < filtros.avaliacaoMin
    )
      return false;
    if (filtros.disponivel && p.disponibilidade !== "DISPONIVEL") return false;
    if (filtros.pecaUnica && p.modalidadeProducao !== "PECA_UNICA")
      return false;
    return true;
  });

  const ordenados = [...filtrados];
  if (filtros.ordenar === "menor-preco") {
    ordenados.sort((a, b) => a.preco - b.preco);
  } else if (filtros.ordenar === "maior-preco") {
    ordenados.sort((a, b) => b.preco - a.preco);
  } else if (filtros.ordenar === "melhor-avaliacao") {
    ordenados.sort((a, b) => mediaDe(b.id) - mediaDe(a.id));
  }

  const limite = Math.min(Math.max(filtros.limite ?? 8, 1), 48);
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const inicio = (pagina - 1) * limite;

  return {
    total: ordenados.length,
    pagina,
    limite,
    itens: ordenados.slice(inicio, inicio + limite).map(paraResumo),
  };
}

export function listarDestaques(): ProdutoResumo[] {
  return produtos
    .filter((p) => p.destaque && p.disponibilidade === "DISPONIVEL")
    .map(paraResumo);
}

export function buscarProduto(id: string): ProdutoDetalhe | null {
  const produto = produtos.find((p) => p.id === id);
  return produto ? paraDetalhe(produto) : null;
}

// Converte os IDs devolvidos pelo módulo de IA em cartões, na ordem recebida.
// IDs que o site não conhece ou peças reservadas/vendidas ficam de fora.
export function resumosPorIds(ids: string[]): ProdutoResumo[] {
  return ids
    .map((id) => produtos.find((p) => p.id === id))
    .filter((p): p is ProdutoMock => !!p && p.disponibilidade === "DISPONIVEL")
    .map(paraResumo);
}

// Baseline da recomendação: mesma técnica primeiro, depois mesma região.
export function recomendarPara(produtoId: string | null): ProdutoResumo[] {
  const base = produtos.find((p) => p.id === produtoId);
  if (!base) return listarDestaques().slice(0, 4);

  const regiaoBase = achar(artesaos, base.artesaoId).regiaoId;
  const pontos = (p: ProdutoMock) =>
    (p.tecnicaId === base.tecnicaId ? 2 : 0) +
    (achar(artesaos, p.artesaoId).regiaoId === regiaoBase ? 1 : 0);

  return produtos
    .filter((p) => p.id !== base.id && p.disponibilidade === "DISPONIVEL")
    .sort((a, b) => pontos(b) - pontos(a))
    .slice(0, 4)
    .map(paraResumo);
}

export function avaliacoesDe(produtoId: string): RespostaAvaliacoes {
  const itens = notasDe(produtoId).sort((a, b) =>
    b.criadoEm.localeCompare(a.criadoEm),
  );
  return { media: mediaDe(produtoId), total: itens.length, itens };
}

export function perfilDoArtesao(id: string): ArtesaoPerfil | null {
  const artesao = artesaos.find((a) => a.id === id);
  if (!artesao) return null;

  const pecas = produtos.filter((p) => p.artesaoId === id);
  const notas = pecas.flatMap((p) => notasDe(p.id));
  const soma = notas.reduce((total, a) => total + a.nota, 0);

  return {
    id: artesao.id,
    nome: artesao.nome,
    nomeLoja: artesao.nomeLoja,
    biografia: artesao.biografia,
    regiao: artesao.cidade,
    produtos: pecas.map(paraResumo),
    foto: artesao.foto,
    tecnica: achar(tecnicas, artesao.tecnicaId).nome,
    especialidade: artesao.especialidade,
    verificado: artesao.verificado,
    historia: artesao.historia,
    citacao: artesao.citacao,
    imagens: artesao.imagens,
    avaliacaoMedia:
      notas.length === 0 ? 0 : Math.round((soma / notas.length) * 10) / 10,
    totalAvaliacoes: notas.length,
    pecasVendidas: artesao.pecasVendidas,
  };
}

export function indicadores(): IndicadoresVitrine {
  const soma = avaliacoes.reduce((total, a) => total + a.nota, 0);
  return {
    totalArtesaos: artesaos.length,
    totalProdutos: produtos.length,
    avaliacaoMedia: Math.round((soma / avaliacoes.length) * 10) / 10,
    totalAvaliacoes: avaliacoes.length,
  };
}
