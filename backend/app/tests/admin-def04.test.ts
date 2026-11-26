import request from "supertest";
import { criarApp } from "../src/index";
import prisma from "../src/lib/prisma";
import {
  criarCategoria,
  criarEndereco,
  criarLoja,
  criarProduto,
  criarUsuario,
  criarUsuarioArtesao,
  criarUsuarioComprador,
  gerarToken,
  limparBanco,
} from "./helpers";

const app = criarApp();

describe("TC24 / DEF04 · listagens completas de usuários e artesãos no painel admin", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  test("expõe todos os cadastros, inclusive artesão fora dos 10 recentes, sem credenciais", async () => {
    // Alvo criado primeiro: fica fora do recorte de 10 recentes (ordem decrescente de id).
    const alvo = await criarUsuarioArtesao();
    for (let i = 0; i < 10; i += 1) {
      await criarUsuario(i % 2 === 0 ? "COMPRADOR" : "ARTESAO");
    }
    const admin = await criarUsuario("ADMINISTRADOR");

    const resposta = await request(app)
      .get("/admin/painel/metricas")
      .set({ Authorization: `Bearer ${gerarToken(admin.id, "ADMINISTRADOR")}` })
      .expect(200);

    expect(resposta.body.usuariosCadastrados).toHaveLength(12);
    expect(resposta.body.artesaosCadastrados).toHaveLength(6);
    expect(
      resposta.body.artesaosCadastrados.every(
        (usuario: { papel: string }) => usuario.papel === "ARTESAO",
      ),
    ).toBe(true);

    expect(
      resposta.body.usuariosRecentes.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(false);
    expect(
      resposta.body.usuariosCadastrados.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(true);
    expect(
      resposta.body.artesaosCadastrados.some(
        (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
      ),
    ).toBe(true);

    // Lista de consulta não pode carregar senha, hash ou token.
    const entrada = resposta.body.usuariosCadastrados.find(
      (usuario: { id: string }) => String(usuario.id) === String(alvo.id),
    );
    expect(entrada).toBeDefined();
    expect(Object.keys(entrada!).sort()).toEqual(["id", "nome", "papel", "situacao"]);
    expect(entrada!.situacao).toBe("ATIVO");
  });

  test("mantém o painel restrito a administrador autenticado", async () => {
    const comprador = await criarUsuarioComprador();

    await request(app).get("/admin/painel/metricas").expect(401);
    await request(app)
      .get("/admin/painel/metricas")
      .set({ Authorization: `Bearer ${gerarToken(comprador.id, "COMPRADOR")}` })
      .expect(403);
  });
});

// HU-16, critério "Ação auditável": "Dado que o administrador suspende, reativa, aprova,
// reprova ou modera um registro. Quando confirmar a ação. Então o sistema deve exigir
// justificativa quando aplicável e registrar responsável, data e resultado."
// As sessões vêm do cadastro e do login reais: o token do helper não leva versão de sessão.
describe("TC24 · suspensão e reativação de cadastro com auditoria", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  const SENHA = "SenhaTeste123";
  let sequencia = 0;

  async function cadastrar(papel: "COMPRADOR" | "ARTESAO" | "ADMINISTRADOR") {
    sequencia += 1;
    const email = `${papel.toLowerCase()}.suspensao.${Date.now()}.${sequencia}@test.com`;
    const resposta = await request(app)
      .post("/auth/register")
      .send({
        nome: `${papel} Suspensão`,
        email,
        senha: SENHA,
        papel,
        ...(papel === "ADMINISTRADOR" ? { codigoConvite: "origem-admin-2026" } : {}),
      })
      .expect(201);
    return { id: String(resposta.body.id), email, token: resposta.body.token as string };
  }

  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const entrar = (email: string, senha = SENHA) => request(app).post("/auth/login").send({ email, senha });
  const suspender = (id: string, token: string, corpo: unknown = { justificativa: "Denúncias de pedido não entregue." }) =>
    request(app).put(`/admin/usuarios/${id}/suspensao`).set(comToken(token)).send(corpo as object);
  const reativar = (id: string, token: string, corpo: unknown = { justificativa: "Pendência resolvida com o comprador." }) =>
    request(app).put(`/admin/usuarios/${id}/reativacao`).set(comToken(token)).send(corpo as object);
  const situacaoNoBanco = async (id: string) =>
    (await prisma.usuario.findUniqueOrThrow({ where: { id: Number(id) } })).situacao;
  const auditoria = (id: string) =>
    prisma.acaoAdministrativaUsuario.findMany({ where: { alvoId: Number(id) }, orderBy: { id: "asc" } });

  test("suspende, derruba a sessão aberta, recusa o login e registra responsável, data e resultado", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    await request(app).get("/comprador/pedidos").set(comToken(comprador.token)).expect(200);
    const antes = Date.now();

    const resposta = await suspender(comprador.id, admin.token).expect(200);

    expect(Object.keys(resposta.body).sort()).toEqual(["acao", "efeitos", "id", "justificativa", "realizadaEm", "responsavelId", "situacao"]);
    // Comprador não tem loja: suspender a conta dele não mexe em pedido nenhum.
    expect(resposta.body.efeitos).toEqual({ pedidosCancelados: 0, pagamentosReembolsados: 0, valorReembolsado: 0 });
    expect(resposta.body).toMatchObject({
      id: comprador.id,
      situacao: "SUSPENSO",
      acao: "SUSPENDER",
      justificativa: "Denúncias de pedido não entregue.",
      responsavelId: admin.id,
    });
    expect(await situacaoNoBanco(comprador.id)).toBe("SUSPENSO");

    const registros = await auditoria(comprador.id);
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      alvoId: Number(comprador.id),
      responsavelId: Number(admin.id),
      acao: "SUSPENDER",
      justificativa: "Denúncias de pedido não entregue.",
      situacaoResultante: "SUSPENSO",
    });
    expect(new Date(resposta.body.realizadaEm).getTime()).toBe(registros[0].realizadaEm.getTime());
    expect(Math.abs(registros[0].realizadaEm.getTime() - antes)).toBeLessThan(60_000);

    // Quem já estava logado perde o acesso, com token de versão de sessão ou legado.
    const sessaoAntiga = await request(app).get("/comprador/pedidos").set(comToken(comprador.token)).expect(401);
    expect(sessaoAntiga.body).toEqual({ mensagem: "Sessão encerrada. Faça login novamente." });
    await request(app)
      .get("/comprador/pedidos")
      .set(comToken(gerarToken(comprador.id, "COMPRADOR")))
      .expect(401);

    const login = await entrar(comprador.email).expect(403);
    expect(login.body).toEqual({ mensagem: "Esta conta está suspensa. Fale com o suporte da Origem." });

    // A lista de consulta do painel mostra a situação, e a sessão do administrador segue válida.
    const painel = await request(app).get("/admin/painel/metricas").set(comToken(admin.token)).expect(200);
    const naLista = painel.body.usuariosCadastrados.find((u: { id: string }) => u.id === comprador.id);
    expect(naLista.situacao).toBe("SUSPENSO");
  });

  test("senha errada em conta suspensa responde como conta inexistente, sem revelar a suspensão", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    await suspender(comprador.id, admin.token).expect(200);

    const senhaErrada = await entrar(comprador.email, "OutraSenha999").expect(401);
    const inexistente = await entrar("ninguem.suspensao@test.com").expect(401);

    expect(senhaErrada.body).toEqual(inexistente.body);
  });

  test("reativa, devolve o login, mantém a sessão antiga inválida e preserva o registro da suspensão", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const artesao = await cadastrar("ARTESAO");
    await suspender(artesao.id, admin.token).expect(200);

    const resposta = await reativar(artesao.id, admin.token).expect(200);

    expect(resposta.body).toMatchObject({
      id: artesao.id,
      situacao: "ATIVO",
      acao: "REATIVAR",
      justificativa: "Pendência resolvida com o comprador.",
      responsavelId: admin.id,
    });
    expect(await situacaoNoBanco(artesao.id)).toBe("ATIVO");

    const registros = await auditoria(artesao.id);
    expect(registros.map((r) => [r.acao, r.situacaoResultante])).toEqual([
      ["SUSPENDER", "SUSPENSO"],
      ["REATIVAR", "ATIVO"],
    ]);
    expect(registros[1].realizadaEm.getTime()).toBeGreaterThanOrEqual(registros[0].realizadaEm.getTime());

    const login = await entrar(artesao.email).expect(200);
    await request(app).get("/artesao/painel/metricas").set(comToken(login.body.token)).expect((r) => {
      expect(r.status).not.toBe(401);
    });
    // O token de antes da suspensão não volta a valer com a reativação.
    await request(app).get("/artesao/painel/metricas").set(comToken(artesao.token)).expect(401);
  });

  test.each([
    ["ausente", {}],
    ["vazia", { justificativa: "" }],
    ["só com espaços", { justificativa: "   " }],
    ["que não é texto", { justificativa: 123 }],
  ])("justificativa %s é recusada com 400 e nada muda", async (_caso, corpo) => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");

    const resposta = await suspender(comprador.id, admin.token, corpo).expect(400);

    expect(resposta.body.mensagem).toBe("Informe a justificativa da ação.");
    expect(await situacaoNoBanco(comprador.id)).toBe("ATIVO");
    expect(await auditoria(comprador.id)).toHaveLength(0);
    await request(app).get("/comprador/pedidos").set(comToken(comprador.token)).expect(200);
  });

  test("reativação também exige justificativa", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    await suspender(comprador.id, admin.token).expect(200);

    await reativar(comprador.id, admin.token, {}).expect(400);

    expect(await situacaoNoBanco(comprador.id)).toBe("SUSPENSO");
    expect(await auditoria(comprador.id)).toHaveLength(1);
  });

  test("só administrador autenticado suspende ou reativa: sem token 401, outro perfil 403, e nada muda", async () => {
    const comprador = await cadastrar("COMPRADOR");
    const artesao = await cadastrar("ARTESAO");
    const corpo = { justificativa: "Tentativa sem permissão." };

    await request(app).put(`/admin/usuarios/${artesao.id}/suspensao`).send(corpo).expect(401);
    await request(app).put(`/admin/usuarios/${artesao.id}/reativacao`).send(corpo).expect(401);
    await suspender(artesao.id, comprador.token, corpo).expect(403);
    await reativar(artesao.id, comprador.token, corpo).expect(403);
    await suspender(comprador.id, artesao.token, corpo).expect(403);

    expect(await situacaoNoBanco(artesao.id)).toBe("ATIVO");
    expect(await situacaoNoBanco(comprador.id)).toBe("ATIVO");
    expect(await prisma.acaoAdministrativaUsuario.count()).toBe(0);
  });

  test("cadastro inexistente ou id inválido responde 404", async () => {
    const admin = await cadastrar("ADMINISTRADOR");

    await suspender("999999999", admin.token).expect(404);
    await reativar("999999999", admin.token).expect(404);
    await suspender("abc", admin.token).expect(404);

    expect(await prisma.acaoAdministrativaUsuario.count()).toBe(0);
  });

  test("ação que não muda a situação responde 409 e não gera registro", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");

    const reativarAtivo = await reativar(comprador.id, admin.token).expect(409);
    expect(reativarAtivo.body).toEqual({ mensagem: "Esta conta não está suspensa." });

    await suspender(comprador.id, admin.token).expect(200);
    const suspenderDeNovo = await suspender(comprador.id, admin.token).expect(409);
    expect(suspenderDeNovo.body).toEqual({ mensagem: "Esta conta já está suspensa." });

    expect(await auditoria(comprador.id)).toHaveLength(1);
  });

  test("administrador não suspende a própria conta", async () => {
    const admin = await cadastrar("ADMINISTRADOR");

    const resposta = await suspender(admin.id, admin.token).expect(409);

    expect(resposta.body).toEqual({ mensagem: "Você não pode suspender a própria conta." });
    expect(await situacaoNoBanco(admin.id)).toBe("ATIVO");
    await request(app).get("/admin/painel/metricas").set(comToken(admin.token)).expect(200);
  });

  test("duas suspensões simultâneas da mesma conta deixam um registro só", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");

    const respostas = await Promise.all([suspender(comprador.id, admin.token), suspender(comprador.id, admin.token)]);

    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await auditoria(comprador.id)).toHaveLength(1);
  });
});

// Decisão da equipe em 26/11 (issue #42): loja suspensa não vende. As peças saem da venda,
// o pedido que ainda não foi enviado é cancelado e o que foi pago é reembolsado. Pedido já
// enviado ou entregue segue como está.
describe("TC24 · suspensão de artesão tira as peças da venda e reembolsa o pedido não enviado", () => {
  beforeEach(limparBanco);
  afterAll(limparBanco);

  const SENHA = "SenhaTeste123";
  let sequencia = 0;

  async function cadastrar(papel: "COMPRADOR" | "ARTESAO" | "ADMINISTRADOR") {
    sequencia += 1;
    const resposta = await request(app)
      .post("/auth/register")
      .send({
        nome: `${papel} Loja`,
        email: `${papel.toLowerCase()}.loja.${Date.now()}.${sequencia}@test.com`,
        senha: SENHA,
        papel,
        ...(papel === "ADMINISTRADOR" ? { codigoConvite: "origem-admin-2026" } : {}),
      })
      .expect(201);
    return { id: String(resposta.body.id), token: resposta.body.token as string };
  }

  /** Artesão com loja e uma peça aprovada, com 10 unidades em estoque. */
  async function artesaoComPeca(nome: string) {
    const artesao = await cadastrar("ARTESAO");
    const categoria = await criarCategoria(`Categoria ${nome}`);
    const loja = await criarLoja(Number(artesao.id), `Loja ${nome}`);
    const produto = await criarProduto(categoria.id, loja.id, { nome, preco: 100, estoque: 10 });
    return { ...artesao, loja, produto };
  }

  /** Pedido gravado direto no banco, na situação pedida. Com `pago`, leva um pagamento aprovado. */
  async function pedidoCom(compradorId: string, produtoIds: number[], status: string, pago: boolean) {
    const endereco = await criarEndereco();
    const pedido = await prisma.pedido.create({
      data: {
        usuarioId: Number(compradorId),
        enderecoEntregaId: endereco.id,
        status,
        data: new Date(),
        itens: {
          create: produtoIds.map((produtoId, indice) => ({ numeroItem: indice + 1, produtoId, quantidade: 1, precoUnitario: 100, subtotal: 100 })),
        },
      },
    });
    if (pago) {
      await prisma.pagamento.create({
        data: { pedidoId: pedido.id, data: new Date(), valor: 100 * produtoIds.length, status: "APROVADO", formaPagamento: "PIX" },
      });
    }
    return pedido;
  }

  const comToken = (token: string) => ({ Authorization: `Bearer ${token}` });
  const suspender = (id: string, token: string) =>
    request(app).put(`/admin/usuarios/${id}/suspensao`).set(comToken(token)).send({ justificativa: "Loja com denúncias de fraude." });
  const reativar = (id: string, token: string) =>
    request(app).put(`/admin/usuarios/${id}/reativacao`).set(comToken(token)).send({ justificativa: "Denúncias apuradas e descartadas." });
  const estoqueDe = async (produtoId: number) =>
    (await prisma.estoque.findUniqueOrThrow({ where: { produtoId } })).quantidadeDisponivel;
  const statusDe = async (pedidoId: number) => (await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } })).status;
  const nomesNoCatalogo = async () =>
    (await request(app).get("/produtos?limite=50").expect(200)).body.itens.map((item: { nome: string }) => item.nome);

  test("peças saem do catálogo, do detalhe, do perfil da loja e do carrinho, e voltam na reativação", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    const suspenso = await artesaoComPeca("Vaso da Loja Suspensa");
    const outro = await artesaoComPeca("Vaso da Loja Ativa");

    expect(await nomesNoCatalogo()).toEqual(expect.arrayContaining(["Vaso da Loja Suspensa", "Vaso da Loja Ativa"]));
    await request(app).get(`/produtos/${suspenso.produto.id}`).expect(200);
    await request(app).get(`/artesaos/${suspenso.id}/perfil`).expect(200);

    await suspender(suspenso.id, admin.token).expect(200);

    const nomes = await nomesNoCatalogo();
    expect(nomes).not.toContain("Vaso da Loja Suspensa");
    expect(nomes).toContain("Vaso da Loja Ativa");
    await request(app).get(`/produtos/${suspenso.produto.id}`).expect(404);
    await request(app).get(`/artesaos/${suspenso.id}/perfil`).expect(404);
    await request(app).get(`/artesaos/${outro.id}/perfil`).expect(200);
    const noCarrinho = await request(app)
      .post("/carrinho/itens")
      .set(comToken(comprador.token))
      .send({ produtoId: String(suspenso.produto.id), quantidade: 1 })
      .expect(409);
    expect(noCarrinho.body).toEqual({ mensagem: "Produto indisponível." });
    // A peça não foi apagada nem pausada: só deixou de aparecer.
    const noBanco = await prisma.produto.findUniqueOrThrow({ where: { id: suspenso.produto.id } });
    expect(noBanco).toMatchObject({ excluido: false, pausado: false, statusValidacao: "APROVADA" });

    await reativar(suspenso.id, admin.token).expect(200);

    expect(await nomesNoCatalogo()).toContain("Vaso da Loja Suspensa");
    await request(app).get(`/produtos/${suspenso.produto.id}`).expect(200);
    await request(app).get(`/artesaos/${suspenso.id}/perfil`).expect(200);
    await request(app)
      .post("/carrinho/itens")
      .set(comToken(comprador.token))
      .send({ produtoId: String(suspenso.produto.id), quantidade: 1 })
      .expect((r) => expect([200, 201]).toContain(r.status));
  });

  test("peça que já estava no carrinho trava o fechamento da compra, sem criar pedido nem baixar estoque", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    const artesao = await artesaoComPeca("Vaso no Carrinho");
    await request(app)
      .post("/carrinho/itens")
      .set(comToken(comprador.token))
      .send({ produtoId: String(artesao.produto.id), quantidade: 2 })
      .expect((r) => expect([200, 201]).toContain(r.status));
    await suspender(artesao.id, admin.token).expect(200);

    const resposta = await request(app)
      .post("/pedidos/checkout")
      .set(comToken(comprador.token))
      .send({ enderecoEntrega: { cep: "50000-000", rua: "Rua Teste", numero: "123", cidade: "Recife" } })
      .expect(409);

    expect(resposta.body.mensagem).toBe('A peça "Vaso no Carrinho" não está mais disponível. Retire-a do carrinho para continuar.');
    expect(await prisma.pedido.count()).toBe(0);
    expect(await estoqueDe(artesao.produto.id)).toBe(10);
  });

  test("cancela o pedido não enviado, devolve o estoque e reembolsa o que foi pago; enviado e entregue seguem", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    const artesao = await artesaoComPeca("Vaso com Pedidos");
    const id = artesao.produto.id;
    const aguardando = await pedidoCom(comprador.id, [id], "AGUARDANDO_PAGAMENTO", false);
    const pago = await pedidoCom(comprador.id, [id], "PAGO", true);
    const emProducao = await pedidoCom(comprador.id, [id], "EM_PRODUCAO", true);
    const enviado = await pedidoCom(comprador.id, [id], "ENVIADO", true);
    const entregue = await pedidoCom(comprador.id, [id], "ENTREGUE", true);
    const jaCancelado = await pedidoCom(comprador.id, [id], "CANCELADO", false);

    const resposta = await suspender(artesao.id, admin.token).expect(200);

    expect(resposta.body.efeitos).toEqual({ pedidosCancelados: 3, pagamentosReembolsados: 2, valorReembolsado: 200 });
    expect(await statusDe(aguardando.id)).toBe("CANCELADO");
    expect(await statusDe(pago.id)).toBe("CANCELADO");
    expect(await statusDe(emProducao.id)).toBe("CANCELADO");
    expect(await statusDe(enviado.id)).toBe("ENVIADO");
    expect(await statusDe(entregue.id)).toBe("ENTREGUE");
    // Três pedidos cancelados, uma unidade cada: o estoque de 10 vai a 13.
    expect(await estoqueDe(id)).toBe(13);

    const pagamentos = await prisma.pagamento.findMany({ orderBy: { pedidoId: "asc" } });
    expect(pagamentos.map((p) => [p.pedidoId, p.status])).toEqual([
      [pago.id, "REEMBOLSADO"],
      [emProducao.id, "REEMBOLSADO"],
      [enviado.id, "APROVADO"],
      [entregue.id, "APROVADO"],
    ]);
    expect(pagamentos[0].motivo).toBe("Reembolso: pedido cancelado pela suspensão da loja antes do envio.");
    expect(Number(pagamentos[0].valor)).toBe(100);

    const historico = await prisma.historicoPedido.findMany({ orderBy: { id: "asc" } });
    expect(historico.map((h) => [h.pedidoId, h.status, h.observacao])).toEqual([
      [aguardando.id, "CANCELADO", "Cancelado pela suspensão da loja de uma das peças."],
      [pago.id, "CANCELADO", "Cancelado pela suspensão da loja de uma das peças. Valor reembolsado."],
      [emProducao.id, "CANCELADO", "Cancelado pela suspensão da loja de uma das peças. Valor reembolsado."],
    ]);
    expect(await prisma.historicoPedido.count({ where: { pedidoId: jaCancelado.id } })).toBe(0);

    // O comprador vê o cancelamento no histórico de compras dele.
    const compras = await request(app).get("/comprador/pedidos").set(comToken(comprador.token)).expect(200);
    expect(JSON.stringify(compras.body)).toContain("CANCELADO");

    // Reativar devolve as peças à venda, mas não desfaz cancelamento nem reembolso.
    const reativacao = await reativar(artesao.id, admin.token).expect(200);
    expect(reativacao.body.efeitos).toEqual({ pedidosCancelados: 0, pagamentosReembolsados: 0, valorReembolsado: 0 });
    expect(await statusDe(pago.id)).toBe("CANCELADO");
    expect(await estoqueDe(id)).toBe(13);
  });

  test("pedido com peças de duas lojas é cancelado inteiro e as duas peças voltam ao estoque", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    const suspenso = await artesaoComPeca("Vaso da Suspensa");
    const outro = await artesaoComPeca("Vaso da Outra Loja");
    const misto = await pedidoCom(comprador.id, [suspenso.produto.id, outro.produto.id], "PAGO", true);
    const soDaOutra = await pedidoCom(comprador.id, [outro.produto.id], "PAGO", true);

    const resposta = await suspender(suspenso.id, admin.token).expect(200);

    expect(resposta.body.efeitos).toEqual({ pedidosCancelados: 1, pagamentosReembolsados: 1, valorReembolsado: 200 });
    expect(await statusDe(misto.id)).toBe("CANCELADO");
    expect(await statusDe(soDaOutra.id)).toBe("PAGO");
    expect(await estoqueDe(suspenso.produto.id)).toBe(11);
    expect(await estoqueDe(outro.produto.id)).toBe(11);
  });

  test("pedido cancelado pela suspensão não pode mais ser pago", async () => {
    const admin = await cadastrar("ADMINISTRADOR");
    const comprador = await cadastrar("COMPRADOR");
    const artesao = await artesaoComPeca("Vaso sem Pagamento");
    const pedido = await pedidoCom(comprador.id, [artesao.produto.id], "AGUARDANDO_PAGAMENTO", false);
    await suspender(artesao.id, admin.token).expect(200);

    await request(app)
      .post("/pagamentos")
      .set(comToken(comprador.token))
      .send({ pedidoId: String(pedido.id), metodoPagamento: "PIX" })
      .expect(400);

    expect(await prisma.pagamento.count()).toBe(0);
    expect(await statusDe(pedido.id)).toBe("CANCELADO");
  });
});

