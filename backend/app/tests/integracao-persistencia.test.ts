import request from "supertest";
import bcrypt from "bcryptjs";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import { recuperacaoRepository } from "../src/repositories/recuperacao.repository";
import { criarUsuario, criarUsuarioArtesao, criarUsuarioComprador, criarCategoria, criarLoja, criarProduto, criarEndereco, criarPedido, criarCarrinhoComItem, gerarToken, limparBanco } from "./helpers";

const app = criarApp();
const auth = (u: { id: number; usuarioTipo: string }) => "Bearer " + gerarToken(u.id, u.usuarioTipo);

describe("Regressões da integração real e persistência", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("perfil e senha são do administrador autenticado e persistem; senha atual errada é negada", async () => {
    const a = await criarUsuario("ADMINISTRADOR", "Admin A");
    const b = await criarUsuario("ADMINISTRADOR", "Admin B");
    await request(app).put("/painel/admin/perfil").set("Authorization", auth(b))
      .send({ nome: "Admin B atualizado", funcao: "Curadoria", telefone: "81911112222" }).expect(200);
    const perfil = await request(app).get("/painel/admin/perfil").set("Authorization", auth(b)).expect(200);
    expect(perfil.body).toMatchObject({ nome: "Admin B atualizado", funcao: "Curadoria", telefone: "81911112222" });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: a.id } })).nome).toBe("Admin A");
    await request(app).put("/painel/admin/senha").set("Authorization", auth(b))
      .send({ senhaAtual: "errada", novaSenha: "senhaNova123", confirmacao: "senhaNova123" }).expect(401);
    await request(app).put("/painel/admin/senha").set("Authorization", auth(b))
      .send({ senhaAtual: "senha123", novaSenha: "senhaNova123", confirmacao: "senhaNova123" }).expect(200);
    const salvo = await prisma.usuario.findUniqueOrThrow({ where: { id: b.id } });
    expect(salvo.senha).not.toBe("senhaNova123");
    expect(await bcrypt.compare("senhaNova123", salvo.senha)).toBe(true);
    await request(app).post("/auth/login").send({ email: b.email, senha: "senha123" }).expect(401);
    await request(app).post("/auth/login").send({ email: b.email, senha: "senhaNova123" }).expect(200);
  });

  test("primeiro perfil do artesão preserva biografia, região, técnicas, redes e configuração de envio", async () => {
    const u = await criarUsuarioArtesao();
    const dados = { nomeArtistico: "Ateliê de teste", regiao: "Agreste", biografia: "Produção artesanal de cerâmica com barro da região.", tecnicas: ["Cerâmica"],
      contato: { telefone: "81922223333", redesSociais: "@atelie-teste" }, certificacoes: ["Registro"], dadosBancarios: "conta mascarada" };
    await request(app).put("/artesao/perfil").set("Authorization", auth(u)).send(dados).expect(200);
    const perfil = await request(app).get("/artesao/perfil").set("Authorization", auth(u)).expect(200);
    expect(perfil.body).toMatchObject(dados);
    await request(app).put("/painel/artesao/envio/configuracoes").set("Authorization", auth(u)).send({ opcaoId: "economico", ativa: false }).expect(200);
    const envio = await request(app).get("/painel/artesao/envio/configuracoes").set("Authorization", auth(u)).expect(200);
    expect(envio.body.opcoes.find((o: any) => o.id === "economico").ativa).toBe(false);
  });

  test("ticket, mensagens e estado persistem e outro usuário não os consulta nem altera", async () => {
    const a = await criarUsuarioComprador(); const b = await criarUsuarioComprador();
    const aberto = await request(app).post("/suporte/tickets").set("Authorization", auth(a)).send({ assunto: "Entrega", mensagem: "Onde está meu pedido?" }).expect(201);
    const id = aberto.body.ticketId;
    await request(app).post("/suporte/tickets/" + id + "/mensagens").set("Authorization", auth(a)).send({ texto: "Informação adicional" }).expect(200);
    await request(app).put("/suporte/tickets/" + id + "/status").set("Authorization", auth(a)).send({ status: "ESCALADO_HUMANO" }).expect(200);
    await request(app).get("/suporte/tickets/" + id).set("Authorization", auth(b)).expect(404);
    await request(app).post("/suporte/tickets/" + id + "/mensagens").set("Authorization", auth(b)).send({ texto: "Não autorizado" }).expect(404);
    const salvo = await prisma.ticket.findUniqueOrThrow({ where: { id: Number(id) }, include: { mensagens: true } });
    expect(salvo.status).toBe("ESCALADO_HUMANO"); expect(salvo.mensagens).toHaveLength(2);
  });

  test("personalização é gravada e listada exclusivamente para seu comprador", async () => {
    const a = await criarUsuarioComprador(); const b = await criarUsuarioComprador(); const artesao = await criarUsuarioArtesao();
    const loja = await criarLoja(artesao.id); const categoria = await criarCategoria(); const p = await criarProduto(categoria.id, loja.id);
    const criada = await request(app).post("/produtos/" + p.id + "/personalizacoes").set("Authorization", auth(a))
      .send({ cor: "azul", tamanho: "", inscricao: "", detalhes: "", mensagem: "Uma peça personalizada para presente." }).expect(201);
    expect(criada.body).toMatchObject({ cor: "azul", status: "ENVIADA", nomeProduto: p.nome });
    expect(await prisma.personalizacao.count()).toBe(1);
    const outras = await request(app).get("/comprador/personalizacoes").set("Authorization", auth(b)).expect(200);
    expect(outras.body).toEqual([]);
  });

  test("TC15 · token de recuperação é de uso único inclusive em duas requisições simultâneas", async () => {
    const u = await criarUsuarioComprador(); const { token } = await recuperacaoRepository.criar(u.id);
    const respostas = await Promise.all([1, 2].map(() => request(app).post("/auth/redefinir-senha").send({ token, senha: "novaSenha456" })));
    expect(respostas.map(r => r.status).sort()).toEqual([200, 400]);
    expect(await bcrypt.compare("novaSenha456", (await prisma.usuario.findUniqueOrThrow({ where: { id: u.id } })).senha)).toBe(true);
    expect((await prisma.recuperacaoSenha.findFirstOrThrow()).usadoEm).not.toBeNull();
  });

  test("duas confirmações simultâneas do carrinho geram um pedido e cobram o frete do servidor", async () => {
    const u = await criarUsuarioComprador(); const a = await criarUsuarioArtesao(); const l = await criarLoja(a.id); const c = await criarCategoria();
    const p = await criarProduto(c.id, l.id, { estoque: 5 }); await criarCarrinhoComItem(u.id, p.id, 1);
    const respostas = await Promise.all([1, 2].map(() => request(app).post("/pedidos/checkout").set("Authorization", auth(u))
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua", numero: "1" }, opcaoEnvioId: "economico" })));
    expect(respostas.filter(r => r.status === 201)).toHaveLength(1);
    expect(respostas.every(r => [201, 400, 409].includes(r.status))).toBe(true);
    expect(await prisma.pedido.count()).toBe(1);
    expect(respostas.find(r => r.status === 201)!.body.valorTotal).toBe(118);
    expect((await prisma.estoque.findUniqueOrThrow({ where: { produtoId: p.id } })).quantidadeDisponivel).toBe(4);
  });

  test("pagamentos concorrentes criam um único pagamento e histórico de aprovação", async () => {
    const u = await criarUsuarioComprador(); const a = await criarUsuarioArtesao(); const l = await criarLoja(a.id); const c = await criarCategoria();
    const p = await criarProduto(c.id, l.id); const e = await criarEndereco(); const pedido = await criarPedido(u.id, e.id, p.id);
    const respostas = await Promise.all([1, 2].map(() => request(app).post("/pagamentos").set("Authorization", auth(u))
      .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX", tokenCartao: null })));
    expect(respostas.map(r => r.status).sort()).toEqual([200, 400]);
    expect(await prisma.pagamento.count({ where: { pedidoId: pedido.id } })).toBe(1);
    expect(await prisma.historicoPedido.count({ where: { pedidoId: pedido.id, status: "PAGO" } })).toBe(1);
  });
});
