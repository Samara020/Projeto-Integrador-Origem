import prisma from "../src/lib/prisma";
import { avaliacoesRemovidas, validacoes } from "../src/lib/memoria";
import jwt from "jsonwebtoken";

export async function limparBanco() {
  validacoes.clear();
  avaliacoesRemovidas.clear();
  await prisma.historicoPedido.deleteMany();
  await prisma.avaliacao.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.enderecoEntrega.deleteMany();
  await prisma.itemCarrinho.deleteMany();
  await prisma.carrinho.deleteMany();
  await prisma.estoque.deleteMany();
  await prisma.imagem.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.loja.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();
}

export function gerarToken(id: number | string, papel: string): string {
  return jwt.sign({ id: String(id), papel }, process.env.JWT_SECRET ?? "test_secret", {
    expiresIn: "1h",
  });
}

let contador = 0;
const unico = () => `${Date.now()}_${contador++}`;

export function criarUsuario(usuarioTipo: "COMPRADOR" | "ARTESAO" | "ADMINISTRADOR", nome = "Usuario Teste") {
  return prisma.usuario.create({
    data: {
      email: `${usuarioTipo.toLowerCase()}${unico()}@test.com`,
      senha: "senha123",
      nome,
      usuarioTipo,
      telefone: "11999999999",
    },
  });
}

export const criarUsuarioComprador = () => criarUsuario("COMPRADOR", "Comprador Teste");
export const criarUsuarioArtesao = () => criarUsuario("ARTESAO", "Artesão Teste");

export function criarCategoria(nome = "Cerâmica") {
  return prisma.categoria.create({ data: { nome, descricao: "Peças de barro" } });
}

export function criarLoja(usuarioId: number, nome = "Loja Teste") {
  return prisma.loja.create({ data: { nome, usuarioId } });
}

export function criarProduto(
  categoriaId: number,
  lojaId: number,
  override: { nome?: string; preco?: number; estoque?: number; tecnica?: string } = {}
) {
  return prisma.produto.create({
    data: {
      nome: override.nome ?? "Vaso de Teste",
      descricao: "Um vaso bonito",
      tecnica: override.tecnica ?? "Cerâmica",
      origem: "Zona da Mata",
      preco: override.preco ?? 100,
      modalidadeProducao: "PRONTA_ENTREGA",
      pecaUnica: false,
      categoriaId,
      lojaId,
      estoque: {
        create: { quantidadeDisponivel: override.estoque ?? 10, pontoReposicao: 0 },
      },
    },
  });
}

export function criarEndereco() {
  return prisma.enderecoEntrega.create({
    data: {
      logradouro: "Rua Teste, 123 - CEP 50000-000",
      bairro: "Centro",
      cidade: "Recife",
      cpf: "12345678901",
    },
  });
}

export function criarCarrinhoComItem(usuarioId: number, produtoId: number, quantidade = 1) {
  return prisma.carrinho.create({
    data: {
      usuarioId,
      status: "ATIVO",
      dataCriacao: new Date(),
      itens: {
        create: [{ numeroItem: 1, produtoId, quantidade, precoUnitario: 100 }],
      },
    },
  });
}

export function criarPedido(usuarioId: number, enderecoEntregaId: number, produtoId: number, quantidade = 1, preco = 100) {
  return prisma.pedido.create({
    data: {
      usuarioId,
      enderecoEntregaId,
      status: "AGUARDANDO_PAGAMENTO",
      data: new Date(),
      itens: {
        create: [
          { numeroItem: 1, produtoId, quantidade, precoUnitario: preco, subtotal: preco * quantidade },
        ],
      },
    },
  });
}
