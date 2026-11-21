# Autenticação e Autorização por Perfil — Marketplace Origem

## 1. Visão Geral e Mecanismo de Sessão
- **Protocolo:** Autenticação via **JSON Web Token (JWT)** enviado no cabeçalho HTTP `Authorization: Bearer <token>`.
- **Armazenamento de Senhas:** Hash criptográfico **bcrypt** com custo (salt rounds) `12` (`bcryptjs`). Nenhuma senha nova ou do seed é armazenada em texto puro; contas legadas são automaticamente convertidas para hash bcrypt no primeiro login válido.
- **Expiração do Token:** Configurável via `JWT_EXPIRES_IN` (padrão `7d`), assinado com `JWT_SECRET`.
- **Logout e Invalidação de Sessão:** O cliente (`authService.sair()`) aciona `POST /auth/logout` para registrar o token na lista de revogação do servidor até sua expiração e remove os dados locais da sessão. Qualquer requisição subsequente com o token revogado é bloqueada pelo middleware `autenticar` com **`401 Unauthorized`**.

## 2. Perfis de Usuário e Permissões

| Perfil (`usuarioTipo`) | Escopo de Acesso |
| :--- | :--- |
| **`COMPRADOR`** | Navegar no catálogo, gerenciar o próprio carrinho, realizar checkout, consultar os próprios pedidos, criar e listar as próprias avaliações (`compradorApenas`) e abrir tickets de suporte. |
| **`ARTESAO`** | Cadastrar, editar, pausar/inativar e gerenciar estoque **apenas das peças da própria loja**, consultar avaliações recebidas (`artesaoApenas`) e visualizar/atualizar o status de produção/envio dos próprios pedidos recebidos. |
| **`ADMINISTRADOR`** | Moderar e validar autenticidade de produtos pendentes, listar e moderar avaliações (`adminApenas`) e administrar tickets de suporte e usuários da plataforma. |

## 3. Endpoints de Autenticação (`/auth`)

### `POST /auth/register` — Cadastro de Usuário
- **Acesso:** Público.
- **Corpo (JSON):** `{ "nome": "Maria Silva", "email": "maria@exemplo.com", "senha": "********", "papel": "COMPRADOR | ARTESAO | ADMINISTRADOR", "codigoConvite": "opcional (obrigatório apenas para ADMINISTRADOR)" }`
- **Validações:**
  - `nome`, `email`, `senha` e `papel` obrigatórios e validados quanto ao tipo (`string`).
  - `nome` com mínimo de 2 caracteres; `email` em formato válido (`usuario@dominio.ext`) e único na base.
  - `senha` com mínimo de 8 caracteres.
  - `papel` restrito a `COMPRADOR`, `ARTESAO` ou `ADMINISTRADOR` (`codigoConvite` validado para `ADMINISTRADOR`).
- **Respostas:** `201 Created` (retorna `{ "id", "nome", "email", "papel" }`), `400 Bad Request` (campos ausentes, tipos/formato inválidos ou e-mail duplicado), `403 Forbidden` (código de convite ausente ou inválido).

### `POST /auth/login` — Autenticação (Login)
- **Acesso:** Público.
- **Corpo (JSON):** `{ "email": "maria@exemplo.com", "senha": "********" }`
- **Respostas:** `200 OK` (retorna `{ "token": "<jwt>", "tipo": "Bearer", "usuario": { "id", "nome", "papel" } }`), `400 Bad Request` (campos ausentes ou inválidos), `401 Unauthorized` (credenciais inválidas).

### `POST /auth/logout` — Encerramento de Sessão e Revogação de Token
- **Acesso:** Autenticado (`Authorization: Bearer <token>`).
- **Comportamento:** Invalida imediatamente o JWT atual no backend (`revogarToken`), impedindo sua reutilização antes da expiração.
- **Respostas:** `200 OK` (`{ "mensagem": "Sessão encerrada com sucesso." }`), `401 Unauthorized` (token ausente, inválido, expirado ou já revogado).

### `POST /auth/recuperar-senha` — Solicitação de Recuperação de Senha
- **Acesso:** Público.
- **Corpo (JSON):** `{ "email": "maria@exemplo.com" }`
- **Respostas:** `200 OK` com confirmação de envio.

## 4. Regras de Autorização e Isolamento de Dados
1. **Identificação (`autenticar`):** Rotas protegidas exigem `Authorization: Bearer <token>`. Ausência, expiração ou revogação por logout retorna **`401 Unauthorized`**.
2. **Controle por Perfil (`exigirPapel`):** Middlewares `compradorApenas`, `artesaoApenas` e `adminApenas` validam `req.usuario.papel` e retornam **`403 Forbidden`** quando o perfil não possui permissão (incluindo rotas de produtos, pedidos, suporte, administração e avaliações).
3. **Posse de Recursos (Ownership):** Operações de alteração/exclusão de produto ou estoque verificam se `produto.lojaId` pertence ao artesão autenticado (`403 Forbidden` caso contrário). Consultas de carrinho, pedidos, avaliações e perfil filtram exclusivamente pelo `id` do usuário extraído do token JWT (`req.usuario.id`).