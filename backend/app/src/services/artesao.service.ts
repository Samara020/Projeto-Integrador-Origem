import { ErroApp } from "../middleware/error";
import { toId } from "../lib/ids";
import { lojaRepository, usuarioRepository } from "../repositories";

type PerfilArtesao = {
  nomeArtistico: string;
  regiao: string;
  biografia: string;
  tecnicas: string[];
  foto?: string | null;
  fotoCapa?: string | null;
  contato: { telefone: string; redesSociais: string };
  certificacoes: string[];
  dadosBancarios: string;
};

const listaDeTexto = (valor: unknown): string[] => {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is string => typeof item === "string");
};

const mediaDe = (notas: { nota: number; status?: string }[]): number => {
  const validas = notas.filter((n) => (n.status ?? "PUBLICADO") === "PUBLICADO");
  if (!validas.length) return 0;
  return Math.round((validas.reduce((s, n) => s + n.nota, 0) / validas.length) * 10) / 10;
};

const disponibilidadeDe = (estoque: number | undefined): "DISPONIVEL" | "VENDIDO" =>
  (estoque ?? 0) > 0 ? "DISPONIVEL" : "VENDIDO";

export const artesaoService = {
  async buscarMeuPerfil(usuarioId: string): Promise<PerfilArtesao> {
    const usuario = await usuarioRepository.buscarComLoja(usuarioId);
    if (!usuario) throw new ErroApp(404, "Usuario nao encontrado.");

    const loja = usuario.loja[0];
    return {
      nomeArtistico: loja?.nome ?? usuario.nome,
      regiao: loja?.regiao ?? "",
      biografia: loja?.descricao ?? "",
      tecnicas: listaDeTexto(loja?.tecnicas),
      foto: loja?.foto ?? null,
      fotoCapa: loja?.fotoCapa ?? null,
      contato: {
        telefone: usuario.telefone ?? "",
        redesSociais: loja?.redesSociais ?? "",
      },
      certificacoes: listaDeTexto(loja?.certificacoes),
      dadosBancarios: loja?.dadosBancarios ?? "",
    };
  },

  async salvarMeuPerfil(usuarioId: string, dados: PerfilArtesao) {
    const id = toId(usuarioId);
    let loja = await lojaRepository.buscarPorUsuarioId(id);

    const dadosLoja = {
      nome: dados.nomeArtistico.trim(),
      descricao: dados.biografia,
      regiao: dados.regiao,
      foto: dados.foto ?? null,
      fotoCapa: dados.fotoCapa ?? null,
      redesSociais: dados.contato.redesSociais,
      tecnicas: dados.tecnicas,
      certificacoes: dados.certificacoes,
      dadosBancarios: dados.dadosBancarios,
    };

    if (!loja) {
      loja = await lojaRepository.criar({ ...dadosLoja, usuarioId: id });
    } else {
      loja = await lojaRepository.atualizar(loja.id, dadosLoja);
    }

    await usuarioRepository.atualizarTelefone(id, dados.contato.telefone);

    return {
      nomeArtistico: loja.nome,
      atualizadoEm: new Date().toISOString(),
    };
  },

  async perfilPublico(usuarioId: string) {
    const usuario = await usuarioRepository.buscarPerfilPublicoArtesao(usuarioId);
    const loja = usuario?.loja[0];
    // Loja de conta suspensa (HU-16) some da vitrine como se não existisse.
    if (!usuario || !loja || usuario.situacao !== "ATIVO") throw new ErroApp(404, "Artesao nao encontrado.");

    const produtos = loja.produtos;
    const ids = produtos.map((p) => p.id);

    const [avaliacoes, pecasVendidas] = await Promise.all([
      lojaRepository.listarAvaliacoesDeProdutos(ids),
      lojaRepository.somarItensVendidos(ids),
    ]);

    const tecnicas = listaDeTexto(loja.tecnicas);
    const foto = loja.foto ?? null;

    return {
      id: usuario.id,
      nome: usuario.nome,
      nomeLoja: loja.nome,
      biografia: loja.descricao ?? "",
      regiao: loja.regiao ?? "",
      foto,
      tecnica: tecnicas[0] ?? "",
      especialidade: tecnicas[0] ?? "",
      verificado: produtos.some((p) => p.seloAtivo),
      historia: [] as string[],
      citacao: "",
      imagens: [loja.foto, loja.fotoCapa].filter((item): item is string => Boolean(item)),
      avaliacaoMedia: mediaDe(avaliacoes),
      totalAvaliacoes: avaliacoes.filter((a) => a.status === "PUBLICADO").length,
      pecasVendidas,
      produtos: produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        imagemPrincipal: p.imagens[0]?.url ?? "",
        seloAtivo: p.seloAtivo,
        regiao: { id: p.origem, nome: p.origem },
        modalidadeProducao: p.modalidadeProducao,
        disponibilidade: disponibilidadeDe(p.estoque?.quantidadeDisponivel),
        estoque: p.estoque?.quantidadeDisponivel ?? 0,
        avaliacaoMedia: mediaDe(p.avaliacoes),
      })),
    };
  },
};
