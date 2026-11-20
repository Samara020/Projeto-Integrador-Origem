// Fluxos completos de persistência frontend -> backend -> Postgres.
import { criarProdutoAprovado, get, post, put, registrarELogar } from "./cliente";

describe("fluxos integrados e persistência real", () => {
  test("perfil do artesão persiste todos os campos editados e perfil público não inventa métricas", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const prod = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: "Peça Perfil Público",
      estoque: 2,
    });

    const dados = {
      nomeArtistico: "Ateliê Barro Vivo Teste",
      regiao: "Caruaru, Pernambuco",
      biografia: "Tradição familiar de cerâmica utilitária e figurativa no Agreste.",
      tecnicas: ["Cerâmica", "Modelagem manual"],
      foto: null,
      fotoCapa: null,
      contato: { telefone: "(81) 98888-7777", redesSociais: "@barrovivoteste" },
      certificacoes: ["Selo Artesanato PE"],
      dadosBancarios: "Banco 260 · Ag 0001 · CC 1234-5",
    };

    const salvo = await put<{ nomeArtistico: string }>("/artesao/perfil", dados, {
      token: artesao.token,
    });
    expect(salvo.status).toBe(200);
    expect(salvo.corpo.nomeArtistico).toBe(dados.nomeArtistico);

    const privado = await get<typeof dados>("/artesao/perfil", { token: artesao.token });
    expect(privado.status).toBe(200);
    expect(privado.corpo).toMatchObject({
      nomeArtistico: dados.nomeArtistico,
      regiao: dados.regiao,
      biografia: dados.biografia,
      tecnicas: dados.tecnicas,
      contato: dados.contato,
      certificacoes: dados.certificacoes,
      dadosBancarios: dados.dadosBancarios,
    });

    const publico = await get<{
      nomeLoja: string;
      verificado: boolean;
      avaliacaoMedia: number;
      totalAvaliacoes: number;
      pecasVendidas: number;
      produtos: { id: string; seloAtivo: boolean; disponibilidade: string }[];
    }>(`/artesaos/${encodeURIComponent(artesao.usuario.id)}/perfil`);

    expect(publico.status).toBe(200);
    expect(publico.corpo.nomeLoja).toBe(dados.nomeArtistico);
    expect(publico.corpo.avaliacaoMedia).toBe(0);
    expect(publico.corpo.totalAvaliacoes).toBe(0);
    expect(publico.corpo.pecasVendidas).toBe(0);
    expect(publico.corpo.produtos[0]).toMatchObject({
      id: prod.id,
      seloAtivo: true,
      disponibilidade: "DISPONIVEL",
    });
  });

  test("configurações de envio do artesão persistem ativação/desativação no banco", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    await criarProdutoAprovado(artesao.token, admin.token);

    const inicial = await get<{ opcoes: { id: string; ativa: boolean }[] }>(
      "/painel/artesao/envio/configuracoes",
      { token: artesao.token },
    );
    expect(inicial.status).toBe(200);

    const desativar = await put<{ id: string; ativa: boolean }>(
      "/painel/artesao/envio/configuracoes",
      { opcaoId: "economico", ativa: false },
      { token: artesao.token },
    );
    expect(desativar.status).toBe(200);
    expect(desativar.corpo).toEqual({ id: "economico", ativa: false });

    const depois = await get<{ opcoes: { id: string; ativa: boolean }[] }>(
      "/painel/artesao/envio/configuracoes",
      { token: artesao.token },
    );
    expect(depois.corpo.opcoes.find((o) => o.id === "economico")?.ativa).toBe(false);
  });

  test("carrinho -> cotação frete -> checkout -> pagamento -> pedidos -> avaliação", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador = await registrarELogar("COMPRADOR");
    const prod = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: "Vaso Checkout Real",
      preco: 150,
      estoque: 3,
    });

    const add = await post(
      "/carrinho/itens",
      { produtoId: prod.id, quantidade: 2 },
      { token: comprador.token },
    );
    expect(add.status).toBe(200);

    // F05: redução atômica via PUT preserva o item; erro de estoque preserva quantidade anterior
    const reduzir = await put<{ mensagem: string }>(
      `/carrinho/itens/${encodeURIComponent(prod.id)}`,
      { quantidade: 1 },
      { token: comprador.token },
    );
    expect(reduzir.status).toBe(200);

    const acimaEstoque = await put<{ mensagem: string }>(
      `/carrinho/itens/${encodeURIComponent(prod.id)}`,
      { quantidade: 10 },
      { token: comprador.token },
    );
    expect(acimaEstoque.status).toBe(409);

    const carrinhoAposPut = await get<{ itens: { produtoId: string; quantidade: number }[] }>(
      "/carrinho",
      { token: comprador.token },
    );
    expect(carrinhoAposPut.corpo.itens).toEqual(
      expect.arrayContaining([expect.objectContaining({ produtoId: prod.id, quantidade: 1 })]),
    );

    const ajustarVolta = await put<{ mensagem: string }>(
      `/carrinho/itens/${encodeURIComponent(prod.id)}`,
      { quantidade: 2 },
      { token: comprador.token },
    );
    expect(ajustarVolta.status).toBe(200);

    const cotacao = await post<{ servico: { id: string }; valor: number }>(
      "/painel/envios/cotacao",
      { cep: "50030-230", pesoKg: 1.6, dimensoes: { altura: 20, largura: 20, profundidade: 20 } },
    );
    expect(cotacao.status).toBe(200);
    expect(cotacao.corpo.valor).toBeGreaterThan(0);

    const pedido = await post<{ pedidoId: string; status: string; valorFrete: number; valorTotal: number }>(
      "/pedidos/checkout",
      {
        opcaoEnvioId: cotacao.corpo.servico.id,
        enderecoEntrega: { cep: "50030-230", rua: "Rua da Aurora", numero: "100" },
      },
      { token: comprador.token },
    );
    expect(pedido.status).toBe(201);
    expect(pedido.corpo.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(pedido.corpo.valorFrete).toBe(cotacao.corpo.valor);
    expect(pedido.corpo.valorTotal).toBe(300 + cotacao.corpo.valor);

    const pagamento = await post<{ status: string }>(
      "/pagamentos",
      { pedidoId: pedido.corpo.pedidoId, metodoPagamento: "PIX", tokenCartao: null },
      { token: comprador.token },
    );
    expect(pagamento.status).toBe(200);
    expect(pagamento.corpo.status).toBe("APROVADO");

    const historico = await get<{ pedidos: { id: string; status: string; valorTotal: number }[] }>(
      "/comprador/pedidos",
      { token: comprador.token },
    );
    expect(historico.status).toBe(200);
    expect(historico.corpo.pedidos[0]).toMatchObject({
      id: pedido.corpo.pedidoId,
      status: "PAGO",
      valorTotal: 300 + cotacao.corpo.valor,
    });

    const avl = await post<{ id: string; status: string }>(
      "/avaliacoes",
      {
        pedidoId: pedido.corpo.pedidoId,
        produtoId: prod.id,
        nota: 5,
        comentario: "Acabamento impecável, chegou muito bem embalado.",
      },
      { token: comprador.token },
    );
    expect(avl.status).toBe(201);

    const minhas = await get<{ produtoId: string }[]>(
      "/avaliacoes/comprador/avaliacoes",
      { token: comprador.token },
    );
    expect(minhas.status).toBe(200);
    expect(minhas.corpo.some((a) => a.produtoId === prod.id)).toBe(true);
  });

  test("suporte e personalização persistem mensagens, status e solicitações", async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const comprador = await registrarELogar("COMPRADOR");
    const prod = await criarProdutoAprovado(artesao.token, admin.token, {
      modalidadeProducao: "SOB_ENCOMENDA",
      estoque: 2,
    });

    const ticket = await post<{ ticketId: string }>(
      "/suporte/tickets",
      { assunto: "Dúvida entrega", mensagem: "Gostaria de confirmar o prazo.", prioridade: "NORMAL" },
      { token: comprador.token },
    );
    expect(ticket.status).toBe(201);

    const resp = await post<{ mensagens: { texto: string }[] }>(
      `/suporte/tickets/${encodeURIComponent(ticket.corpo.ticketId)}/mensagens`,
      { texto: "Nova mensagem do comprador." },
      { token: comprador.token },
    );
    expect(resp.status).toBe(200);
    expect(resp.corpo.mensagens.some((m) => m.texto === "Nova mensagem do comprador.")).toBe(true);

    const esc = await put<{ status: string }>(
      `/suporte/tickets/${encodeURIComponent(ticket.corpo.ticketId)}/status`,
      { status: "ESCALADO_HUMANO" },
      { token: comprador.token },
    );
    expect(esc.status).toBe(200);
    expect(esc.corpo.status).toBe("ESCALADO_HUMANO");

    const perso = await post<{ id: string; status: string }>(
      `/produtos/${encodeURIComponent(prod.id)}/personalizacoes`,
      { cor: "terracota", tamanho: "grande", inscricao: "Recife", detalhes: "Fosco", mensagem: "Para presente." },
      { token: comprador.token },
    );
    expect(perso.status).toBe(201);

    const minhasPerso = await get<{ id: string }[]>("/comprador/personalizacoes", {
      token: comprador.token,
    });
    expect(minhasPerso.status).toBe(200);
    expect(minhasPerso.corpo.some((p) => p.id === perso.corpo.id)).toBe(true);
  });
});
