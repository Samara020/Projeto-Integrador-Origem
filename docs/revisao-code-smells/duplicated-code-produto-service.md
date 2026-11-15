# Revisão de Code Smell — Duplicated Code

**Responsável:** Lara Thaylanne

**Módulo:** Backend (API Node + Express + Prisma)

**Arquivo analisado:** `backend/app/src/services/produto.service.ts`

**Métodos analisados:** `produtoService.atualizar()`, `produtoService.inativar()` e `produtoService.atualizarEstoque()`

## 1. Code Smell identificado

O Code Smell identificado foi **Duplicated Code** (código duplicado).

Os três métodos que alteram uma peça do artesão começavam com o mesmo bloco de checagem de posse, copiado quase igual:

```ts
const produto = await produtoRepository.buscarPorId(id);
if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
if (!loja || produto.lojaId !== loja.id) {
  throw new ErroApp(403, "Voce so pode atualizar suas proprias pecas.");
}
```

A única diferença entre as três cópias era a mensagem do erro 403.

### Impactos na qualidade

- **Manutenibilidade:** essa checagem é uma regra de segurança (um artesão não pode mexer na peça de outro). Se a regra mudar (por exemplo, permitir que o administrador edite qualquer peça, ou checar se a loja está ativa), a mudança precisa ser feita em três lugares. Esquecer um deles abre uma brecha de autorização.
- **Coesão:** cada método misturava duas responsabilidades: verificar permissão e executar a operação. Isso deixava a regra de negócio de cada método menos visível.
- **Legibilidade:** quem lê o arquivo precisa conferir linha por linha para saber se as três checagens são de fato iguais ou se há alguma diferença sutil.
- **Extensibilidade:** toda nova operação sobre peças (por exemplo, trocar imagem) tenderia a copiar o bloco de novo, aumentando a duplicação.

## 2. Análise crítica e decisão

A decisão foi **REFATORAR**.

A duplicação aqui não é acidental: as três cópias representam a mesma regra de negócio ("a peça precisa pertencer à loja do artesão logado"). Quando o código duplicado representa a mesma regra, ele deve ter um único lugar no código. Como a regra é de segurança, o risco de as cópias divergirem com o tempo é maior do que o custo da refatoração.

Também avaliei não refatorar. O argumento a favor seria que cada bloco tem só seis linhas e o arquivo funciona. Mas o custo da refatoração é baixo, a mudança fica restrita a um arquivo e não altera o contrato da API, então o benefício compensa.

### Técnica aplicada: Extract Function (Extrair Função)

Criei a função `buscarProdutoDoArtesao(id, usuarioId, mensagemSemPermissao)` no próprio `produto.service.ts`. Ela busca a peça, lança 404 se não existir, lança 403 se a peça for de outra loja e devolve o produto encontrado. A mensagem do 403 virou parâmetro para manter exatamente as mesmas respostas de antes.

**Depois:**

```ts
async atualizar(id: string, dados: any, usuarioId: string) {
  const produto = await buscarProdutoDoArtesao(
    id,
    usuarioId,
    "Voce so pode atualizar suas proprias pecas."
  );
  // ... regra de atualização
}

async inativar(id: string, usuarioId: string) {
  await buscarProdutoDoArtesao(id, usuarioId, "Voce so pode inativar suas proprias pecas.");
  await produtoRepository.inativar(id);
  // ...
}

async atualizarEstoque(id: string, dados: { estoque: number; situacao: string }, usuarioId: string) {
  const produto = await buscarProdutoDoArtesao(id, usuarioId, "Acesso negado.");
  // ...
}
```

## 3. Validação do comportamento

Antes desta mudança, não havia teste cobrindo a checagem de posse: os testes de produto só verificavam que um comprador não pode criar peças. Para refatorar com segurança, escrevi primeiro **testes de caracterização** em `backend/app/tests/produtos-posse.test.ts`, que fixam o comportamento atual das três rotas:

| Rota | Dona da peça | Artesã de outra loja | Peça inexistente |
|---|---|---|---|
| `PUT /produtos/:id` | 200 | 403 + mensagem | 404 |
| `DELETE /produtos/:id` | 200 | 403 + mensagem | 404 |
| `PUT /produtos/artesao/pecas/:id/estoque` | 200 | 403 + mensagem | 404 |

O teste de 403 no `PUT /produtos/:id` também confere no banco que o preço não foi alterado. Os mesmos testes passam antes e depois da refatoração, o que mostra que o comportamento foi preservado.

## 4. Resultados, benefícios e riscos

**Benefícios esperados**

- A regra de posse fica em um único lugar: uma mudança futura é feita uma vez só.
- Os três métodos ficaram mais curtos e mostram direto a regra de negócio de cada um.
- Novas operações sobre peças podem reaproveitar a função em vez de copiar o bloco.
- O projeto ganhou nove testes cobrindo uma regra de segurança que antes não tinha teste.

**Riscos e limitações**

- As mensagens de 403 continuam diferentes entre as rotas ("Acesso negado." no estoque e mensagens específicas nas outras). Mantive assim de propósito para não alterar o contrato atual da API. Padronizar as mensagens é uma melhoria possível, mas mudaria respostas que o frontend pode estar usando, então ficaria para uma decisão da equipe.
- A função ainda faz duas consultas ao banco (peça e loja), como antes. Não houve ganho nem perda de desempenho.

## 5. Outros smells observados no mesmo arquivo (não tratados nesta intervenção)

- **Duplicated Code + Magic Number** na regra de `disponibilidade`: o cálculo aparece em `listar`, `buscarPorId` e `recomendados`, com os IDs fixos `2006` e `1006` para "RESERVADO". A cópia em `recomendados` já divergiu das outras (não trata o caso reservado), um exemplo do risco descrito acima. Corrigir isso muda o comportamento de `recomendados`, então precisa de decisão da equipe.
- Em `listarPeloArtesao`, as contagens `INATIVO` e `ESGOTADO` usam exatamente o mesmo filtro, o que parece um erro de lógica.
