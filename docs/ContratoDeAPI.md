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
    { "id": "ped_501", "status": "PAGO", "valorTotal": 380.00, "criadoEm": "2026-09-03T21:30:00Z" }
  ]
}
```

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

*Response (200 OK):*
```json
{
  "recomendados": [
    { "id": "prd_202", "nome": "Escultura em Madeira", "preco": 450.00 }
  ]
}
```

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