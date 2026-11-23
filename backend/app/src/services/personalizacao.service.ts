import { ErroApp } from "../middleware/error";
import { personalizacaoRepository } from "../repositories";

const apresentar = (p: any) => ({
  id: p.id, produtoId: p.produtoId, cor: p.cor ?? "", tamanho: p.tamanho ?? "", inscricao: p.inscricao ?? "",
  detalhes: p.detalhes ?? "", mensagem: p.mensagem, status: p.status, criadoEm: p.criadoEm,
  nomeProduto: p.produto.nome, imagemPrincipal: p.produto.imagens[0]?.url ?? "", artesaoNome: p.produto.loja.usuario.nome,
  prazoAdicionalDias: p.prazoAdicionalDias, precoAdicional: Number(p.precoAdicional),
});

export const personalizacaoService = {
  async criar(usuarioId: string, produtoId: string, dados: { cor?: string; tamanho?: string; inscricao?: string; detalhes?: string; mensagem: string }) {
    const produto = await personalizacaoRepository.buscarProdutoAprovado(produtoId);
    if (!produto) throw new ErroApp(404, "Produto não encontrado.");
    if (![dados.cor, dados.tamanho, dados.inscricao, dados.detalhes].some(v => v?.trim()) && dados.mensagem.trim().length < 10) {
      throw new ErroApp(400, "Preencha ao menos uma opção ou escreva sua ideia para o artesão.");
    }
    const p = await personalizacaoRepository.criar({ ...dados, usuarioId, produtoId: produto.id });
    return apresentar(p);
  },
  async minhas(usuarioId: string) {
    return (await personalizacaoRepository.listarPorUsuario(usuarioId)).map(apresentar);
  },
};
