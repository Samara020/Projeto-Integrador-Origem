// Cobertura de fluxos críticos de negócio no backend real + PostgreSQL:
// HU-01 (anti-enumeração), HU-02/12 (sob encomenda), HU-03 (curadoria/reprovação),
// HU-08/11/12 (concorrência em peça única e revalidação de carrinho),
// HU-14 (gestão e cancelamento de pedido), HU-20/21 (moderação e recálculo de média).
import {
  criarProdutoAprovado,
  emailUnico,
  get,
  post,
  put,
  registrarELogar,
} from "./cliente";

const ENDERECO_VALIDO = {
  cep: "55002-000",
  rua: "Rua do Artesanato",
  numero: "42",
  bairro: "Centro",
  cidade: "Caruaru",
};

describe("fluxos críticos integrados (backend real + Postgres)", () => {
  test("HU-11/HU-12 · dois compradores disputando peça única simultaneamente resultam em exatamente 1 pedido e 1 conflito 409", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const compradorA = await registrarELogar("COMPRADOR");
    const compradorB = await registrarELogar("COMPRADOR");

    const pecaUnica = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Única Concorrência ${Date.now()}`,
      modalidadeProducao: "PECA_UNICA",
      estoque: 1,
      preco: 210,
    });

    const addA = await post(
      "/carrinho/itens",
      { produtoId: pecaUnica.id, quantidade: 1 },
      { token: compradorA.token },
    );
    const addB = await post(
      "/carrinho/itens",
      { produtoId: pecaUnica.id, quantidade: 1 },
      { token: compradorB.token },
    );
    expect(addA.status).toBe(200);
    expect(addB.status).toBe(200);

    const [checkoutA, checkoutB] = await Promise.all([
      post<{ pedidoId?: string }>(
        "/pedidos/checkout",
        { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
        { token: compradorA.token },
      ),
      post<{ pedidoId?: string }>(
        "/pedidos/checkout",
        { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
        { token: compradorB.token },
      ),
    ]);

    const statusOrdenados = [checkoutA.status, checkoutB.status].sort((a, b) => a - b);
    expect(statusOrdenados).toEqual([201, 409]);

    const detalhe = await get<{ estoque: number; disponibilidade: string }>(
      `/produtos/${encodeURIComponent(pecaUnica.id)}`,
    );
    expect(detalhe.status).toBe(200);
    expect(detalhe.corpo.estoque).toBe(0);
    expect(detalhe.corpo.disponibilidade).toBe("VENDIDO");
  }, 25000);

  test("HU-08/HU-11 · carrinho bloqueia mais de 1 unidade de peça única e checkout revalida estoque zerado antes da confirmação", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador = await registrarELogar("COMPRADOR");

    const pecaUnica = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Única Carrinho ${Date.now()}`,
      modalidadeProducao: "PECA_UNICA",
      estoque: 1,
    });

    const duasUnidades = await post(
      "/carrinho/itens",
      { produtoId: pecaUnica.id, quantidade: 2 },
      { token: comprador.token },
    );
    expect(duasUnidades.status).toBe(409);

    const umaUnidade = await post(
      "/carrinho/itens",
      { produtoId: pecaUnica.id, quantidade: 1 },
      { token: comprador.token },
    );
    expect(umaUnidade.status).toBe(200);

    const atualizarParaDois = await put(
      `/carrinho/itens/${encodeURIComponent(pecaUnica.id)}`,
      { quantidade: 2 },
      { token: comprador.token },
    );
    expect(atualizarParaDois.status).toBe(409);

    // Artesão zera estoque enquanto o item ainda está no carrinho do comprador
    const zerar = await put(
      `/produtos/artesao/pecas/${encodeURIComponent(pecaUnica.id)}/estoque`,
      { estoque: 0 },
      { token: artesao.token },
    );
    expect(zerar.status).toBe(200);

    const checkoutSemEstoque = await post(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador.token },
    );
    expect(checkoutSemEstoque.status).toBe(409);
  }, 20000);

  test("HU-01 · recuperação de senha responde de forma neutra para e-mail cadastrado e não cadastrado (anti-enumeração)", async () => {
    const conta = await registrarELogar("COMPRADOR");

    const existente = await post<{ mensagem: string }>("/auth/recuperar-senha", {
      email: conta.email,
    });
    const inexistente = await post<{ mensagem: string }>("/auth/recuperar-senha", {
      email: emailUnico("nao-existe"),
    });

    expect(existente.status).toBe(200);
    expect(inexistente.status).toBe(200);
    expect(existente.corpo.mensagem).toBe(inexistente.corpo.mensagem);
  });

  test("HU-03 · reprovação exige justificativa, mantém selo inativo e impede exibição pública da peça", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");

    const criada = await post<{ id: string }>(
      "/produtos",
      {
        nome: `Peça Curadoria ${Date.now()}`,
        descricao: "Peça submetida para validação de origem.",
        categoria: "Cerâmica",
        tecnica: "Cerâmica manual",
        origem: "Tracunhaém, PE",
        preco: 130,
        modalidadeProducao: "PRONTA_ENTREGA",
        estoque: 2,
        imagens: ["/produtos/vaso-ceramica.jpg"],
      },
      { token: artesao.token },
    );
    expect(criada.status).toBe(201);
    const id = String(criada.corpo.id);

    const semJustificativa = await put(
      `/produtos/admin/produtos/${encodeURIComponent(id)}/validacao`,
      { status: "REPROVADA", justificativa: "   " },
      { token: admin.token },
    );
    expect(semJustificativa.status).toBe(400);

    const reprovada = await put<{ statusValidacao: string; seloAtivo: boolean }>(
      `/produtos/admin/produtos/${encodeURIComponent(id)}/validacao`,
      { status: "REPROVADA", justificativa: "Evidências de origem insuficientes." },
      { token: admin.token },
    );
    expect(reprovada.status).toBe(200);
    expect(reprovada.corpo.statusValidacao).toBe("REPROVADA");
    expect(reprovada.corpo.seloAtivo).toBe(false);

    const detalhePublico = await get(`/produtos/${encodeURIComponent(id)}`);
    expect(detalhePublico.status).toBe(404);
  });

  test("HU-20/HU-21 · avaliação suspeita entra em moderação sem distorcer a média e moderação recalcula a média pública", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador1 = await registrarELogar("COMPRADOR");
    const comprador2 = await registrarELogar("COMPRADOR");

    const produto = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Moderação ${Date.now()}`,
      estoque: 5,
      preco: 90,
    });

    async function comprarEPagar(token: string) {
      await post("/carrinho/itens", { produtoId: produto.id, quantidade: 1 }, { token });
      const ped = await post<{ pedidoId: string }>(
        "/pedidos/checkout",
        { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
        { token },
      );
      expect(ped.status).toBe(201);
      const pag = await post(
        "/pagamentos",
        { pedidoId: String(ped.corpo.pedidoId), metodoPagamento: "PIX", tokenCartao: null },
        { token },
      );
      expect(pag.status).toBe(200);
      return String(ped.corpo.pedidoId);
    }

    const pedido1 = await comprarEPagar(comprador1.token);
    const pedido2 = await comprarEPagar(comprador2.token);

    // Avaliação normal publicada (nota 5)
    const avLimpa = await post<{ id: string; status: string }>(
      "/avaliacoes",
      {
        pedidoId: pedido1,
        produtoId: produto.id,
        nota: 5,
        comentario: "Acabamento excelente e envio cuidadoso.",
      },
      { token: comprador1.token },
    );
    expect(avLimpa.status).toBe(201);
    expect(avLimpa.corpo.status).toBe("PUBLICADO");

    // Avaliação suspeita com contato externo (nota 1) vai para moderação
    const avSuspeita = await post<{ id: string; status: string }>(
      "/avaliacoes",
      {
        pedidoId: pedido2,
        produtoId: produto.id,
        nota: 1,
        comentario: "Chama no whatsapp para pagar fora via pix https://spam.exemplo",
      },
      { token: comprador2.token },
    );
    expect(avSuspeita.status).toBe(201);
    expect(avSuspeita.corpo.status).toBe("EM_MODERACAO");

    const antes = await get<{ media: number; total: number }>(
      `/avaliacoes/produtos/${encodeURIComponent(produto.id)}/avaliacoes`,
    );
    expect(antes.status).toBe(200);
    expect(antes.corpo.total).toBe(1);
    expect(antes.corpo.media).toBe(5);

    const fila = await get<{ itens: { id: string }[] }>(
      "/avaliacoes/admin/avaliacoes?status=EM_MODERACAO",
      { token: admin.token },
    );
    expect(fila.status).toBe(200);
    expect(fila.corpo.itens.map((a) => String(a.id))).toContain(String(avSuspeita.corpo.id));

    // Ao aprovar (MANTER), média recalcula para (5 + 1) / 2 = 3
    const manter = await put(
      `/avaliacoes/admin/avaliacoes/${encodeURIComponent(avSuspeita.corpo.id)}/moderar`,
      { acao: "MANTER" },
      { token: admin.token },
    );
    expect(manter.status).toBe(200);

    const aposManter = await get<{ media: number; total: number }>(
      `/avaliacoes/produtos/${encodeURIComponent(produto.id)}/avaliacoes`,
    );
    expect(aposManter.corpo.total).toBe(2);
    expect(aposManter.corpo.media).toBe(3);

    // Ao remover (REMOVER), volta para média 5 e total 1
    const remover = await put(
      `/avaliacoes/admin/avaliacoes/${encodeURIComponent(avSuspeita.corpo.id)}/moderar`,
      { acao: "REMOVER" },
      { token: admin.token },
    );
    expect(remover.status).toBe(200);

    const aposRemover = await get<{ media: number; total: number }>(
      `/avaliacoes/produtos/${encodeURIComponent(produto.id)}/avaliacoes`,
    );
    expect(aposRemover.corpo.total).toBe(1);
    expect(aposRemover.corpo.media).toBe(5);
  }, 25000);

  test("HU-14/HU-12 · artesão exige rastreio para envio, cancelamento restaura estoque e bloqueia reabertura", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador = await registrarELogar("COMPRADOR");

    const produto = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Cancelamento ${Date.now()}`,
      estoque: 3,
      preco: 110,
    });

    await post(
      "/carrinho/itens",
      { produtoId: produto.id, quantidade: 2 },
      { token: comprador.token },
    );
    const ped = await post<{ pedidoId: string }>(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador.token },
    );
    expect(ped.status).toBe(201);
    const pedidoId = String(ped.corpo.pedidoId);

    const detalheAposCompra = await get<{ estoque: number }>(
      `/produtos/${encodeURIComponent(produto.id)}`,
    );
    expect(detalheAposCompra.corpo.estoque).toBe(1);

    // ENVIADO sem código de rastreio retorna 400
    const semRastreio = await put(
      `/artesao/pedidos/${encodeURIComponent(pedidoId)}/status`,
      { statusProducao: "ENVIADO" },
      { token: artesao.token },
    );
    expect(semRastreio.status).toBe(400);

    // CANCELADO restaura estoque (1 -> 3)
    const cancelar = await put(
      `/artesao/pedidos/${encodeURIComponent(pedidoId)}/status`,
      { statusProducao: "CANCELADO" },
      { token: artesao.token },
    );
    expect(cancelar.status).toBe(200);

    const detalheAposCancelamento = await get<{ estoque: number }>(
      `/produtos/${encodeURIComponent(produto.id)}`,
    );
    expect(detalheAposCancelamento.corpo.estoque).toBe(3);

    // Não permite alterar pedido já CANCELADO (409)
    const reabrir = await put(
      `/artesao/pedidos/${encodeURIComponent(pedidoId)}/status`,
      { statusProducao: "EM_PRODUCAO" },
      { token: artesao.token },
    );
    expect(reabrir.status).toBe(409);
  }, 20000);

  test("HU-02/HU-12 · peça SOB_ENCOMENDA persiste prazo e capacidade de produção no catálogo e detalhe", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");

    const sobEncomenda = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Escultura Sob Encomenda ${Date.now()}`,
      modalidadeProducao: "SOB_ENCOMENDA",
      estoque: 2,
      prazoProducaoDias: 15,
      capacidadeProducao: 5,
      preco: 320,
    });

    const detalhe = await get<{
      modalidadeProducao: string;
      prazoProducaoDias: number | null;
      capacidadeProducao: number | null;
      disponibilidade: string;
    }>(`/produtos/${encodeURIComponent(sobEncomenda.id)}`);

    expect(detalhe.status).toBe(200);
    expect(detalhe.corpo.modalidadeProducao).toBe("SOB_ENCOMENDA");
    expect(detalhe.corpo.prazoProducaoDias).toBe(15);
    expect(detalhe.corpo.capacidadeProducao).toBe(5);
    expect(detalhe.corpo.disponibilidade).toBe("DISPONIVEL");
  });

  test("HU-10/HU-11 (RN33) · pagamento recusado cancela pedido, libera reserva de peça única e permite nova compra", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador1 = await registrarELogar("COMPRADOR");
    const comprador2 = await registrarELogar("COMPRADOR");

    const pecaUnica = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Única Recusa ${Date.now()}`,
      modalidadeProducao: "PECA_UNICA",
      estoque: 1,
      preco: 195,
    });

    await post("/carrinho/itens", { produtoId: pecaUnica.id, quantidade: 1 }, { token: comprador1.token });
    const checkout1 = await post<{ pedidoId: string }>(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador1.token },
    );
    expect(checkout1.status).toBe(201);

    const reservada = await get<{ estoque: number; disponibilidade: string }>(
      `/produtos/${encodeURIComponent(pecaUnica.id)}`,
    );
    expect(reservada.corpo.estoque).toBe(0);
    expect(reservada.corpo.disponibilidade).toBe("VENDIDO");

    const pagamentoRecusado = await post<{
      status: string;
      statusPedido: string;
      reservaLiberada: boolean;
      mensagem: string;
    }>(
      "/pagamentos",
      {
        pedidoId: String(checkout1.corpo.pedidoId),
        metodoPagamento: "CARTAO_CREDITO",
        tokenCartao: "tok_recusado_saldo",
        motivoFalha: "Cartão recusado pelo emissor.",
      },
      { token: comprador1.token },
    );

    expect(pagamentoRecusado.status).toBe(402);
    expect(pagamentoRecusado.corpo.status).toBe("RECUSADO");
    expect(pagamentoRecusado.corpo.statusPedido).toBe("CANCELADO");
    expect(pagamentoRecusado.corpo.reservaLiberada).toBe(true);

    const liberada = await get<{ estoque: number; disponibilidade: string }>(
      `/produtos/${encodeURIComponent(pecaUnica.id)}`,
    );
    expect(liberada.corpo.estoque).toBe(1);
    expect(liberada.corpo.disponibilidade).toBe("DISPONIVEL");

    // Outro comprador consegue finalizar a peça liberada
    await post("/carrinho/itens", { produtoId: pecaUnica.id, quantidade: 1 }, { token: comprador2.token });
    const checkout2 = await post<{ pedidoId: string }>(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador2.token },
    );
    expect(checkout2.status).toBe(201);
  }, 25000);

  test("HU-10 (RN38) · eventos repetidos e concorrentes de pagamento com mesma Idempotency-Key retornam a mesma transação", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador = await registrarELogar("COMPRADOR");

    const produto = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: `Peça Idempotência ${Date.now()}`,
      estoque: 5,
      preco: 140,
    });

    await post("/carrinho/itens", { produtoId: produto.id, quantidade: 1 }, { token: comprador.token });
    const checkout = await post<{ pedidoId: string }>(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador.token },
    );
    expect(checkout.status).toBe(201);

    const chave = `idem-api-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const payload = {
      pedidoId: String(checkout.corpo.pedidoId),
      metodoPagamento: "PIX",
      tokenCartao: null,
    };

    const [p1, p2] = await Promise.all([
      post<{ transacaoId: string; status: string; idempotente: boolean }>(
        "/pagamentos",
        payload,
        { token: comprador.token, headers: { "Idempotency-Key": chave } },
      ),
      post<{ transacaoId: string; status: string; idempotente: boolean }>(
        "/pagamentos",
        payload,
        { token: comprador.token, headers: { "Idempotency-Key": chave } },
      ),
    ]);

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    expect(p1.corpo.transacaoId).toBe(p2.corpo.transacaoId);
    expect([p1.corpo.idempotente, p2.corpo.idempotente].sort()).toEqual([false, true]);

    // Reutilizar a mesma chave em outro pedido resulta em 409
    await post("/carrinho/itens", { produtoId: produto.id, quantidade: 1 }, { token: comprador.token });
    const checkout2 = await post<{ pedidoId: string }>(
      "/pedidos/checkout",
      { enderecoEntrega: ENDERECO_VALIDO, opcaoEnvioId: "economico" },
      { token: comprador.token },
    );
    expect(checkout2.status).toBe(201);

    const conflito = await post(
      "/pagamentos",
      {
        pedidoId: String(checkout2.corpo.pedidoId),
        metodoPagamento: "PIX",
        tokenCartao: null,
      },
      { token: comprador.token, headers: { "Idempotency-Key": chave } },
    );
    expect(conflito.status).toBe(409);
  }, 25000);

  test("HU-01 (TC11) · 5 tentativas inválidas de login ativam bloqueio temporário com 429 e Retry-After", async () => {
    const conta = await registrarELogar("COMPRADOR");

    for (let i = 0; i < 5; i += 1) {
      const falha = await post<{ mensagem: string }>("/auth/login", {
        email: conta.email,
        senha: `SenhaErrada${i}!`,
      });
      expect(falha.status).toBe(401);
    }

    const bloqueado = await post<{ mensagem: string }>("/auth/login", {
      email: conta.email,
      senha: conta.senha,
    });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.corpo.mensagem).toMatch(/temporariamente bloqueada/i);
    expect(Number(bloqueado.cabecalhos.get("retry-after"))).toBeGreaterThan(0);
  }, 20000);
});
