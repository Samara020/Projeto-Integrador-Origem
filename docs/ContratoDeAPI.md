### Isso não é o resultado definitivo do contrato de API

# Modelo de Contrato de API Completo - Sistema Origem

Este documento estabelece o contrato de API RESTful completo para o **Sistema Origem**, contemplando os fluxos transacionais, carrinho, pedidos, pagamentos, avaliações, suporte e painéis de gestão conforme o backlog priorizado do projeto.

---

## 1. Padrões Gerais da API

- **Base URL:** `/`
- **Formato de Requisição/Resposta:** `application/json`
- **Autenticação:** Bearer Token (JWT) via cabeçalho `Authorization: Bearer <token>` para rotas protegidas.
- **Códigos de Status HTTP Padrão:**
  - `200 OK`: Sucesso na requisição.
  - `201 Created`: Recurso criado com sucesso.
  - `400 Bad Request`: Dados inválidos ou ausentes.
  - `401 Unauthorized`: Falha de autenticação (não logado).
  - `403 Forbidden`: Acesso negado por falta de permissão (RBAC).
  - `404 Not Found`: Recurso não encontrado.
  - `500 Internal Server Error`: Erro interno no servidor.

---

## 2. Endpoints por Módulo / Histórias de Usuário

### 2.1. Módulo: Identidade, Segurança e Acesso (HU-01)

#### POST /auth/register
Cadastra um novo usuário no sistema.

```json
{
  "nome": "João Comprador",
  "email": "joao@comprador.com",
  "senha": "senhaSegura123",
  "papel": "COMPRADOR"
}
```
*Response (201 Created):*
```json
{
  "id": "usr_101",
  "nome": "João Comprador",
  "email": "joao@comprador.com",
  "papel": "COMPRADOR",
  "criadoEm": "2026-09-03T21:00:00Z"
}
```

*Proposta do frontend (lacuna):* para `"papel": "ADMINISTRADOR"`, o corpo leva também `"codigoConvite"`, o código que a equipe entrega a quem vai administrar. Sem código válido, a resposta é `403 Forbidden` com `{ "mensagem": "Código de convite inválido." }`. Comprador e artesão não enviam o campo.

#### POST /auth/login
Autentica o usuário e emite o token de sessão.

```json
{
  "email": "joao@comprador.com",
  "senha": "senhaSegura123"
}
```
*Response (200 OK):*
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "tipo": "Bearer",
  "usuario": {
    "id": "usr_101",
    "nome": "João Comprador",
    "papel": "COMPRADOR"
  }
}
```

#### POST /auth/recuperar-senha
Solicita o envio de instrução/token para redefinição de senha.

```json
{
  "email": "joao@comprador.com"
}
```
*Response (200 OK):*
```json
{
  "mensagem": "E-mail de recuperação enviado com sucesso."
}
```

---

### 2.2. Módulo: Gestão de Produtos e Artesãos (HU-02, HU-11, HU-12)

#### POST /produtos
Cadastra uma nova peça artesanal (Exclusivo para papel `ARTESAO`).

```json
{
  "nome": "Vaso de Cerâmica Marajoara",
  "descricao": "Peça modelada à mão utilizando técnicas ancestrais.",
  "categoria": "Cerâmica",
  "tecnica": "Modelagem manual",
  "origem": "Belém, PA",
  "preco": 350.00,
  "modalidadeProducao": "PECA_UNICA",
  "estoque": 1,
  "prazoProducaoDias": null,
  "capacidadeProducao": null,
  "imagens": ["https://storage.sistemaorigem.com/img1.jpg"]
}
```
*Response (201 Created):*
```json
{
  "id": "prd_201",
  "statusValidacao": "PENDENTE",
  "criadoEm": "2026-09-03T21:10:00Z"
}
```

> Lacuna acordada para a tela "Cadastro de peça" do painel do artesão: a peça
> precisa de `sku`, `material`, `dimensoes`, `peso`, `certificado` e
> `informacoesOrigem`, e a resposta devolve o `sku` gerado.

```json
{
  "nome": "Luminária Mandacaru",
  "descricao": "Peça modelada e vazada à mão, inspirada na luz do sertão.",
  "categoria": "Casa e decoração",
  "tecnica": "Cerâmica manual",
  "material": "Barro vermelho, pigmento natural",
  "dimensoes": "28 × 18 × 18 cm",
  "peso": 1.2,
  "origem": "Caruaru, Pernambuco · tradição familiar desde 1987",
  "preco": 145.00,
  "modalidadeProducao": "PECA_UNICA",
  "estoque": 8,
  "informacoesOrigem": "Caruaru, Pernambuco · tradição familiar desde 1987",
  "certificado": "certificado_luminaria.pdf",
  "imagens": ["https://storage.sistemaorigem.com/img1.jpg"]
}
```
*Response (201 Created):*
```json
{
  "id": "prd_201",
  "sku": "ORG-LUM-014",
  "statusValidacao": "PENDENTE",
  "criadoEm": "2026-09-03T21:10:00Z"
}
```

#### PUT /produtos/{id}
Atualiza os dados de uma peça existente (Exclusivo para o artesão dono da peça).

```json
{
  "preco": 380.00,
  "descricao": "Peça modelada à mão, edição atualizada."
}
```
*Response (200 OK):*
```json
{
  "id": "prd_201",
  "preco": 380.00,
  "atualizadoEm": "2026-09-03T21:15:00Z"
}
```

#### DELETE /produtos/{id}
Inativa/Remove uma peça do catálogo.

*Response (200 OK):*
```json
{
  "mensagem": "Produto inativado com sucesso."
}
```

#### GET /artesao/pecas
Lista as peças do artesão autenticado com os dados que a tela "Gestão de estoque"
mostra: SKU, quantidade em estoque e situação do anúncio.
*(Exemplo: `GET /artesao/pecas?situacao=ESTOQUE_BAIXO`)*

*Response (200 OK):*
```json
{
  "total": 1,
  "pagina": 1,
  "limite": 20,
  "contagem": { "ATIVO": 18, "INATIVO": 3, "ESGOTADO": 3, "ESTOQUE_BAIXO": 0 },
  "itens": [
    {
      "id": "prd_201",
      "nome": "Luminária Mandacaru",
      "sku": "ORG-LUM-014",
      "imagemPrincipal": "https://storage.sistemaorigem.com/img1.jpg",
      "estoque": 8,
      "situacao": "ATIVO"
    }
  ]
}
```

> `contagem` vem junto do envelope para os filtros da tela ("Todos", "Ativos",
> "Inativos", "Esgotados") mostrarem o total de cada situação, mesmo com um
> filtro aplicado.

#### PUT /artesao/pecas/{id}/estoque
Atualiza a quantidade em estoque ou pausa a venda da peça.

```json
{
  "estoque": 2,
  "situacao": "ATIVO"
}
```
*Response (200 OK):*
```json
{
  "id": "prd_201",
  "estoque": 2,
  "situacao": "ATIVO"
}
```

---

### 2.3. Módulo: Validação de Origem e Autenticidade (HU-03)

#### GET /admin/produtos/pendentes
Lista todas as peças aguardando auditoria de origem (Exclusivo para `ADMINISTRADOR`).

*Response (200 OK):*
```json
{
  "total": 1,
  "itens": [
    {
      "id": "prd_201",
      "nome": "Vaso de Cerâmica Marajoara",
      "artesao": { "id": "usr_948", "nome": "Maria Silva" }
    }
  ]
}
```

#### PUT /admin/produtos/{id}/validacao
Analisa e altera o status de validação de origem e autenticidade da peça.

```json
{
  "status": "APROVADA",
  "justificativa": "Evidências e rastreabilidade documental validadas com sucesso."
}
```
*Response (200 OK):*
```json
{
  "id": "prd_201",
  "statusValidacao": "APROVADA",
  "seloAtivo": true
}
```

---

### 2.4. Módulo: Vitrine, Catálogo e Busca Avançada (HU-04, HU-06, HU-25)

#### GET /produtos
Retorna o catálogo de peças ativas com suporte a paginação e filtros combinados.
*(Exemplo: `GET /produtos?termo=ceramica&categoria=Decoracao&origem=Para&pagina=1&limite=10`)*

*Response (200 OK):*
```json
{
  "total": 1,
  "pagina": 1,
  "limite": 10,
  "itens": [
    {
      "id": "prd_201",
      "nome": "Vaso de Cerâmica Marajoara",
      "preco": 380.00,
      "imagemPrincipal": "https://storage.sistemaorigem.com/img1.jpg",
      "artesao": { "id": "usr_948", "nome": "Maria Silva" },
      "seloAtivo": true
    }
  ]
}
```

#### GET /produtos/{id}
Retorna informações detalhadas de uma peça específica e dados do artesão.

*Response (200 OK):*
```json
{
  "id": "prd_201",
  "nome": "Vaso de Cerâmica Marajoara",
  "preco": 380.00,
  "modalidadeProducao": "PECA_UNICA",
  "seloAtivo": true,
  "artesao": {
    "id": "usr_948",
    "nome": "Maria Silva",
    "loja": "Ateliê Raízes da Arte"
  }
}
```

#### GET /produtos/comparar?ids=prd_201,prd_202
Compara atributos técnicos e de origem entre duas ou mais peças.

*Response (200 OK):*
```json
{
  "produtosComparados": [
    { "id": "prd_201", "nome": "Vaso A", "preco": 380.00, "tecnica": "Manual" },
    { "id": "prd_202", "nome": "Vaso B", "preco": 420.00, "tecnica": "Torno" }
  ]
}
```

---

### 2.5. Módulo: Perfis de Lojas e Artesãos (HU-07)

#### GET /artesaos/{id}/perfil
Retorna o perfil público e a vitrine de produtos de um artesão.

*Response (200 OK):*
```json
{
  "id": "usr_948",
  "nome": "Maria Silva",
  "nomeLoja": "Ateliê Raízes da Arte",
  "biografia": "Trabalhos em cerâmica regional.",
  "regiao": "Belém, PA",
  "produtos": [
    { "id": "prd_201", "nome": "Vaso de Cerâmica Marajoara", "preco": 380.00 }
  ]
}
```

#### GET /artesao/perfil
Retorna os dados de edição do perfil do artesão autenticado, incluindo o que
não é público: contato, redes sociais, certificações e dados bancários.

*Response (200 OK):*
```json
{
  "nomeArtistico": "Ana Pereira Cerâmica",
  "regiao": "Caruaru, PE",
  "biografia": "Minha cerâmica nasce do barro do Agreste e das memórias da minha família.",
  "tecnicas": ["Cerâmica", "Modelagem manual", "Pintura mineral"],
  "foto": "https://storage.sistemaorigem.com/ana.jpg",
  "fotoCapa": "https://storage.sistemaorigem.com/ana-capa.jpg",
  "contato": { "telefone": "(81) 99999-2210", "redesSociais": "@anapereiraceramica" },
  "certificacoes": ["Selo Artesanato de Pernambuco"],
  "dadosBancarios": "Banco 260 · Ag. 0001 · •••• 4821"
}
```

#### PUT /artesao/perfil
Salva os dados de edição do perfil do artesão autenticado.

```json
{
  "nomeArtistico": "Ana Pereira Cerâmica",
  "regiao": "Caruaru, PE",
  "biografia": "Minha cerâmica nasce do barro do Agreste.",
  "tecnicas": ["Cerâmica"],
  "contato": { "telefone": "(81) 99999-2210", "redesSociais": "@anapereiraceramica" },
  "certificacoes": ["Selo Artesanato de Pernambuco"],
  "dadosBancarios": "Banco 260 · Ag. 0001 · •••• 4821"
}
```
*Response (200 OK):*
```json
{
  "nomeArtistico": "Ana Pereira Cerâmica",
  "atualizadoEm": "2026-09-25T18:40:00Z"
}
```

---

### 2.6. Módulo: Carrinho, Checkout e Pagamento (HU-08, HU-09, HU-10)

#### GET /carrinho
Consulta os itens adicionados ao carrinho do comprador autenticado.

*Response (200 OK):*
```json
{
  "itens": [
    { "produtoId": "prd_201", "quantidade": 1, "precoUnitario": 380.00 }
  ],
  "valorTotal": 380.00
}
```

#### POST /carrinho/itens
Adiciona uma peça ao carrinho.

```json
{
  "produtoId": "prd_201",
  "quantidade": 1
}
```
*Response (200 OK):*
```json
{
  "mensagem": "Item adicionado ao carrinho com sucesso."
}
```

#### DELETE /carrinho/itens/{produtoId}
Remove um item do carrinho.

*Response (200 OK):*
```json
{
  "mensagem": "Item removido do carrinho."
}
```

#### POST /pedidos/checkout
Efetiva a criação do pedido a partir do carrinho atual.

```json
{
  "enderecoEntrega": {
    "cep": "66000-000",
    "rua": "Rua Principal",
    "numero": "100"
  }
}
```
*Response (201 Created):*
```json
{
  "pedidoId": "ped_501",
  "status": "AGUARDANDO_PAGAMENTO",
  "valorTotal": 380.00
}
```

#### POST /pagamentos
Processa o pagamento do pedido criado.

```json
{
  "pedidoId": "ped_501",
  "metodoPagamento": "PIX",
  "tokenCartao": null
}
```
*Response (200 OK):*
```json
{
  "transacaoId": "trx_999",
  "status": "APROVADO",
  "dataPagamento": "2026-09-03T21:30:00Z"
}
```

---

### 2.7. Módulo: Pedidos e Logística (HU-13, HU-14, HU-18)

#### GET /comprador/pedidos
Lista o histórico de pedidos realizados pelo comprador autenticado.

*Response (200 OK):*
```json
{
  "pedidos": [
    {
      "id": "ped_501",
      "status": "PAGO",
      "valorTotal": 380.00,
      "criadoEm": "2026-09-03T21:30:00Z",
      "itens": [
        {
          "produtoId": "prd_201",
          "nome": "Vaso de Cerâmica Marajoara",
          "imagemPrincipal": "https://storage.sistemaorigem.com/img1.jpg",
          "quantidade": 1,
          "precoUnitario": 380.00
        }
      ]
    }
  ]
}
```

> Lacuna acordada para a tela de histórico e acompanhamento: cada pedido deve
> trazer os itens comprados (`produtoId`, `nome`, `imagemPrincipal`,
> `quantidade` e `precoUnitario`).

#### GET /artesao/pedidos
Lista os pedidos recebidos contendo peças do artesão autenticado.

*Response (200 OK):*
```json
{
  "pedidosRecebidos": [
    { "id": "ped_501", "produtoId": "prd_201", "statusProducao": "EM_PREPARACAO" }
  ]
}
```

> Lacuna acordada para a tela "Gestão de pedidos" do painel do artesão: cada
> pedido precisa de `criadoEm`, `comprador` (`nome` e `local`), `itens`
> (`produtoId`, `nome`, `quantidade` e `precoUnitario`), `valorTotal`,
> `statusProducao` (`NOVO`, `EM_PRODUCAO`, `PRONTO`, `ENVIADO`, `ENTREGUE` ou
> `CANCELADO`), `proximaAcao` e `codigoRastreio` quando já houver envio.

```json
{
  "pedidosRecebidos": [
    {
      "id": "ped_501",
      "criadoEm": "2026-09-11T14:20:00Z",
      "statusProducao": "NOVO",
      "comprador": { "nome": "Marina Costa", "local": "Recife, PE" },
      "itens": [
        {
          "produtoId": "prd_201",
          "nome": "Luminária Mandacaru",
          "quantidade": 1,
          "precoUnitario": 145.00
        }
      ],
      "valorTotal": 145.00,
      "proximaAcao": "ACEITAR",
      "codigoRastreio": null
    }
  ]
}
```

#### PUT /artesao/pedidos/{id}/status
Atualiza o status de produção/envio do pedido.

```json
{
  "statusProducao": "ENVIADO",
  "codigoRastreioCorreios": "AB123456789BR"
}
```
*Response (200 OK):*
```json
{
  "id": "ped_501",
  "statusProducao": "ENVIADO"
}
```

---

### 2.8. Módulo: Avaliações e Moderação (HU-19, HU-20, HU-21)

#### POST /avaliacoes
Permite ao comprador avaliar uma peça após a compra confirmada.

```json
{
  "pedidoId": "ped_501",
  "produtoId": "prd_201",
  "nota": 5,
  "comentario": "Peça belíssima e acabamento impecável!"
}
```
*Response (201 Created):*
```json
{
  "id": "avl_701",
  "status": "PUBLICADO"
}
```

#### GET /artesao/avaliacoes
Consulta as avaliações recebidas nas peças do artesão.

*Response (200 OK):*
```json
{
  "mediaNotas": 4.9,
  "avaliacoes": [
    { "id": "avl_701", "nota": 5, "comentario": "Peça belíssima e acabamento impecável!" }
  ]
}
```

#### PUT /admin/avaliacoes/{id}/moderar
Modera uma avaliação sinalizada como suspeita ou inapropriada.

```json
{
  "acao": "REMOVER"
}
```
*Response (200 OK):*
```json
{
  "id": "avl_701",
  "status": "REMOVIDO"
}
```

---

### 2.9. Módulo: Suporte (HU-22, HU-23)

#### POST /suporte/tickets
Abre uma solicitação de suporte na plataforma.

```json
{
  "assunto": "Dúvida sobre prazo de entrega",
  "mensagem": "Gostaria de saber se o envio pode ser expresso."
}
```
*Response (201 Created):*
```json
{
  "ticketId": "tkt_801",
  "status": "TRIAGEM_INTELIGENTE"
}
```

#### GET /suporte/tickets
Lista os tickets de suporte abertos pelo usuário ou geridos pela equipe.

*Response (200 OK):*
```json
{
  "tickets": [
    { "ticketId": "tkt_801", "assunto": "Dúvida sobre prazo de entrega", "status": "ABERTO" }
  ]
}
```

---

### 2.10. Módulo: Recomendações e Painéis de Gestão (HU-15, HU-16, HU-17)

#### GET /produtos/recomendacoes
Retorna recomendações personalizadas de produtos para o cliente.

Parâmetro: `produtoId` (peça que o cliente está vendo).

*Response (200 OK):*
```json
{
  "recomendados": [
    {
      "id": "prd_202",
      "nome": "Escultura em Madeira",
      "preco": 450.00,
      "motivo": "Recomendado por mesma categoria, mesma técnica artesanal."
    }
  ]
}
```

> Integração com o módulo de IA (HU-17, `modulo-ia/`): cada item tem os campos
> de `ProdutoResumo` e um `motivo` opcional com a justificativa da IA. A rota do
> site chama `POST /recommendations` do módulo (chave em `X-API-Key`) e troca os
> IDs devolvidos pelos cartões das peças. Se o módulo estiver fora do ar,
> responder com erro ou passar de 2 s, a rota usa o baseline local e o item vem
> sem `motivo`. Lista vazia esconde a seção "Você também pode gostar".
> As sugestões da IA e do baseline local incluem somente peças com
> `disponibilidade: "DISPONIVEL"`; peças reservadas ou vendidas ficam de fora.

#### GET /artesao/painel/metricas
Retorna métricas consolidadas de vendas, estoque e faturamento do artesão.

*Response (200 OK):*
```json
{
  "totalVendasMes": 1520.00,
  "produtosAtivos": 4,
  "pedidosPendentes": 2
}
```

> Lacuna acordada para a tela "Dashboard do artesão": os cartões, o gráfico dos
> últimos 30 dias, os alertas e a lista de pedidos recentes vêm na mesma rota.
> `vendasPorDia` traz um ponto por dia do gráfico e `alertas` traz a contagem de
> itens que precisam de ação, com `destino` indicando a tela que resolve.

```json
{
  "vendasMes": 8420.00,
  "variacaoVendas": 18,
  "pedidosPendentes": 12,
  "pedidosNovos": 3,
  "avaliacaoMedia": 4.8,
  "totalAvaliacoes": 126,
  "visualizacoes": 2846,
  "variacaoVisualizacoes": 24,
  "produtosAtivos": 4,
  "vendasPorDia": [{ "dia": "2026-09-01", "valor": 180.00 }],
  "alertas": [
    {
      "id": "estoque-baixo",
      "quantidade": 3,
      "mensagem": "3 peças com estoque baixo",
      "acao": "Ver estoque",
      "destino": "/painel/artesao/estoque"
    }
  ],
  "pedidosRecentes": [
    {
      "id": "ped_1048",
      "comprador": "Marina Costa",
      "itens": "Luminária Mandacaru × 1",
      "valorTotal": 145.00,
      "statusProducao": "NOVO"
    }
  ]
}
```

#### GET /artesao/envio/configuracoes
Retorna as opções de envio, os tipos de embalagem e os prazos por região usados
pela tela "Transporte e embalagem" do painel do artesão.

*Response (200 OK):*
```json
{
  "opcoes": [
    { "id": "economico", "nome": "Origem Econômico", "prazo": "6 a 8 dias úteis", "ativa": true }
  ],
  "tiposEmbalagem": [{ "id": "caixa-papelao", "nome": "Caixa de papelão reciclado" }],
  "prazosPorRegiao": [{ "regiao": "Nordeste", "prazo": "3 a 5 dias" }]
}
```

#### PUT /artesao/envio/configuracoes
Ativa ou desativa uma opção de envio do artesão.

```json
{
  "opcaoId": "expresso",
  "ativa": true
}
```
*Response (200 OK):*
```json
{
  "id": "expresso",
  "ativa": true
}
```

#### POST /envios/cotacao
Calcula o frete de um pacote com base no CEP de destino, no peso e nas
dimensões informadas pelo ateliê. Rota de cálculo, sem efeito colateral.

```json
{
  "cep": "01310-100",
  "pesoKg": 1.2,
  "dimensoes": { "altura": 30, "largura": 22, "profundidade": 22 }
}
```
*Response (200 OK):*
```json
{
  "servico": { "id": "economico", "nome": "Origem Econômico", "prazo": "6 a 8 dias úteis" },
  "valor": 24.80
}
```

#### GET /admin/painel/metricas
Retorna métricas globais e indicadores administrativos da plataforma.

*Response (200 OK):*
```json
{
  "totalUsuarios": 350,
  "totalArtesaos": 45,
  "volumeTransacionadoGlobal": 28450.00
}
```

---

## 3. Rotas da demonstração de concorrência

Estas rotas existem apenas na API C# da demonstração do produto `prd_201`. Não substituem o checkout geral descrito na seção 2.6. Estoque, pedidos e mensagens são mantidos em memória durante a execução da API.

#### GET /demo/saude

Retorna `200 OK` com `{ "mensagem": "API funcionando" }` quando a API está acessível.

#### GET /demo/estoque

Retorna `{ "estoque": 1 }` antes da primeira compra aprovada e `{ "estoque": 0 }` depois dela.

#### POST /demo/compras

```json
{
  "tentativaId": "8b5ee3de-8305-46ef-8cfa-1c5909c39c9d",
  "usuario": "comprador-1",
  "produtoId": "prd_201",
  "quantidade": 1
}
```

*Response (200 OK), inclusive quando a mesma tentativa é repetida com os mesmos dados:*

```json
{
  "mensagem": "Compra aprovada e notificação enfileirada.",
  "pedidoId": "ped_demo_8b5ee3de830546ef8cfa1c5909c39c9d",
  "usuario": "comprador-1",
  "estoque": 0
}
```

Estoque insuficiente ou ID de tentativa reutilizado com outros dados retorna `409 Conflict` com `{ "mensagem": "..." }`. Entrada inválida retorna `400 Bad Request`. Fila cheia retorna `503 Service Unavailable` sem descontar o estoque.

#### GET /demo/mensagens/{pedidoId}

Consulta o estado da notificação simulada: `ENFILEIRADA`, `PROCESSADA` ou `FALHOU`.

```json
{
  "pedidoId": "ped_demo_8b5ee3de830546ef8cfa1c5909c39c9d",
  "estado": "PROCESSADA"
}
```

Uma mensagem desconhecida retorna `404 Not Found`.
