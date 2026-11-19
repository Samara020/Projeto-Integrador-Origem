import prisma from "../lib/prisma";
import { toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";

const incluir = { produto: { include: { imagens: { take: 1 }, loja: { include: { usuario: { select: { nome: true } } } } } } };
const apresentar = (p: any) => ({
  id: p.id, produtoId: p.produtoId, cor: p.cor ?? "", tamanho: p.tamanho ?? "", inscricao: p.inscricao ?? "",
  detalhes: p.detalhes ?? "", mensagem: p.mensagem, status: p.status, criadoEm: p.criadoEm,
  nomeProduto: p.produto.nome, imagemPrincipal: p.produto.imagens[0]?.url ?? "", artesaoNome: p.produto.loja.usuario.nome,
  prazoAdicionalDias: p.prazoAdicionalDias, precoAdicional: Number(p.precoAdicional),
});

export const personalizacaoService = {
  async criar(usuarioId: string, produtoId: string, dados: { cor?: string; tamanho?: string; inscricao?: string; detalhes?: string; mensagem: string }) {
    const produto = await prisma.produto.findFirst({ where: { id: toId(produtoId), excluido: false, pausado: false, statusValidacao: "APROVADA" } });
    if (!produto) throw new ErroApp(404, "Produto não encontrado.");
    if (![dados.cor, dados.tamanho, dados.inscricao, dados.detalhes].some(v => v?.trim()) && dados.mensagem.trim().length < 10) {
      throw new ErroApp(400, "Preencha ao menos uma opção ou escreva sua ideia para o artesão.");
    }
    const p = await prisma.personalizacao.create({
      data: { ...dados, usuarioId: toId(usuarioId), produtoId: produto.id }, include: incluir,
    });
    return apresentar(p);
  },
  async minhas(usuarioId: string) {
    return (await prisma.personalizacao.findMany({ where: { usuarioId: toId(usuarioId) }, orderBy: { id: "desc" }, include: incluir })).map(apresentar);
  },
};
