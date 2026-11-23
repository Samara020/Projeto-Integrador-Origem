# Documentação das Refatorações Realizadas

**Projeto:** Origem (Marketplace da Economia Criativa e do Artesanato de Pernambuco)
**Disciplina:** Requisitos, Projeto de Software e Validação (ADS020 · 2026.2)
**Data de consolidação:** 22/11/2026

Este documento consolida as refatorações realizadas no código do Origem durante o semestre, registrando o problema encontrado e sua origem, o estado anterior e posterior do código quando pertinente, a motivação técnica da solução adotada, a relação com histórias de usuário, requisitos, regras de negócio ou falhas, a rastreabilidade por commit e os resultados das validações executadas.

Análises individuais aprofundadas de revisões de code smells também permanecem versionadas em `docs/revisao-code-smells/`.

---

## 1. Mapa consolidado e rastreabilidade

| ID | Refatoração | Módulo | Origem / Problema | Técnica aplicada | Commit | Responsável | Relação (HU / RN / RF / TC) |
|---|---|---|---|---|---|---|---|
| REF-01 | Reorganização dos scripts SQL | Banco de Dados | Scripts sem ordem explícita e backup na pasta ativa | Organização e versionamento sequencial | `98312ca` | Samara | RN34 a RN38 (integridade e carga inicial do banco) |
| REF-02 | Decomposição do serviço de recomendações | Módulo de IA | Long Method em `recommendations()` | Extract Function | `57b8aa6` | Samara | HU-17, RF-01 a RF-12, RNF-02, RNF-03, RNF-07 |
| REF-03 | Centralização da checagem de posse da peça | Backend | Duplicated Code em três métodos de `produto.service.ts` | Extract Function | `a59d926` | Lara | HU-01 (01.3, 01.7), HU-02, HU-12, HU-15 (15.3), RN02 |
| REF-04 | Extração dos cartões de pedido do artesão | Frontend | Large Component / baixa coesão em `PedidosArtesao.tsx` | Extract Component | `e64e39e` | Carlos | HU-14 (gestão de pedidos pelo artesão), TC07 |
| REF-05 | Separação de configurações de envio e rastreio | Frontend | Large Component / mistura de fluxos em `TransporteArtesao.tsx` | Extract Component | `4e25d29` | Allana | HU-18 (transporte e embalagem), HU-14 (rastreio), RN16 |
| REF-06 | Extração da validação do formulário de cadastro | Frontend | Long Function e regras espalhadas em `FormularioCadastro.tsx` | Extract Function | `11b1f36` | João Pedro | HU-01 (cadastro e perfis), RN01, RN03, TC01, TC08 |
| REF-07 | Centralização dos dados do artesão no serviço de produtos | Backend | Message Chains (`loja.usuario.*`) em `produto.service.ts` | Extract Method | `971a3a8` | Samara | HU-03, HU-04, HU-05, HU-07, RN02, RN08, TC03 |
| REF-08 | Remoção de chamada obsoleta no checkout | Frontend | Dead Code remanescente da Fake API em `useCheckout.ts` | Remove Dead Code | `281a454` | Nicolas | HU-09, HU-10, RN28 a RN31, TC06 |
| REF-09 | Remoção de comentários redundantes na rota de pedidos | Backend | Comentários redundantes em `pedidos.routes.ts` | Clean Code / remoção de ruído | `4f4a278` | Leandro | HU-09, HU-13, HU-14, RN15 a RN20 |
| REF-10 | Extração da tabela de gestão de estoque | Frontend | Large Component / mistura de filtro e edição em `EstoqueArtesao.tsx` | Extract Component | `1ae15de` | Nicolas | HU-12 (estoque), HU-15, RN07, RN23 a RN25, TC05 |
| REF-11 | Limpeza de artefatos duplicados e dependência proibida | Repositório / Frontend | Dois schemas Prisma com versões divergentes e pacote `react-icons` | Remoção de duplicidade e alinhamento de stack | `b99d1d7` | Carlos | Diretrizes arquiteturais (`DESIGN.md`, integridade de build e schema único) |

---

## 2. Detalhamento das refatorações

### REF-01 · Reorganização dos scripts SQL de inicialização
- **Commit:** `98312ca` (`refactor(database): reorganiza scripts SQL`) · **Data:** 04/11/2026 · **Responsável:** Samara
- **Arquivos afetados:** `database/sql/01_create_tables.sql`, `02_integrity_rules.sql`, `03_seed_teste.sql`, `04_create_indexes.sql`, `database/sql_backup/create_tables_backup.sql`, `database/README.md`
- **Problema encontrado e origem:** Os scripts SQL na pasta `database/sql/` não tinham prefixo numérico de ordenação e conviviam com `create_tables_backup.sql` no mesmo diretório. Na inicialização automática do PostgreSQL via Docker, a ausência de ordem determinística e a presença de um arquivo de backup podiam gerar execução fora de sequência ou tentativa de recriar tabelas já existentes.
- **Justificativa da solução adotada:** Os scripts ativos foram numerados sequencialmente (`01` a `04`) para garantir ordem determinística de criação de tabelas, regras de integridade, carga de teste e índices, enquanto o arquivo de backup foi movido para `database/sql_backup/` e a documentação em `database/README.md` foi atualizada.
- **Relação com requisitos e regras:** **RN34 a RN38** (chaves primárias, integridade referencial, restrições e consistência estrutural do banco) e requisito operacional de subida reproduzível com `docker compose`.
- **Evidência de validação:** Inicialização validada posteriormente no setup automático do backend e na suíte de integração com PostgreSQL 17 (9/9 suítes e 134/134 testes aprovados em `docs/testes/evidencia-integracao-banco.md`).

---

### REF-02 · Decomposição do serviço de recomendações (Long Method)
- **Commit:** `57b8aa6` (`Reorganiza serviço de recomendações`) · **Data:** 15/11/2026 · **Responsável:** Samara
- **Arquivos afetados:** `modulo-ia/app/service.py`
- **Relatório complementar:** [long-method-modulo-ia.md](revisao-code-smells/long-method-modulo-ia.md)
- **Problema encontrado e origem:** Identificado na revisão de code smells do módulo de IA. O método `RecommendationService.recommendations()` acumulava em um único bloco a checagem de disponibilidade, validação da chave de API, validação de limites e filtros, busca do produto de referência, montagem de contexto, seleção de candidatos e registro de tempo de resposta.
- **Código antes e depois:**

Antes (fluxo monolítico concentrado em `recommendations()`):
```python
def recommendations(self, ctx: bentoml.Context, **params) -> dict:
    # Verificava disponibilidade, autenticação, limites, filtros,
    # busca de produto de referência, montagem de contexto,
    # seleção de candidatos e log de latência em um único método.
```

Depois (`recommendations()` atuando como coordenador das funções auxiliares):
```python
def recommendations(self, ctx: bentoml.Context, **params) -> dict:
    request = RecommendationRequest(**params)
    start_time = time.perf_counter()

    erro = validar_disponibilidade(ctx)
    if erro is not None:
        return erro

    erro = validar_autenticacao(ctx)
    if erro is not None:
        return erro

    erro = validar_requisicao(ctx, request)
    if erro is not None:
        return erro

    reference_product, erro = obter_produto_referencia(ctx, reference_id, catalog=catalog)
    if erro is not None:
        return erro

    context = montar_contexto(request, reference_product)
    recommendations = select_candidates(
        context=context,
        reference_product_id=reference_id,
        limit=request.limit,
        catalog=catalog,
    )
    registrar_desempenho(recommendations, start_time)
    return {"recommendations": recommendations}
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Function**, extraindo seis funções auxiliares com responsabilidade única (`validar_disponibilidade`, `validar_autenticacao`, `validar_requisicao`, `obter_produto_referencia`, `montar_contexto` e `registrar_desempenho`). Isso reduziu a complexidade de leitura, facilitou manutenção isolada e manteve intactos os códigos HTTP (400, 401, 403, 404, 500, 503) e o contrato de saída.
- **Relação com requisitos e histórias:** **HU-17** (Recomendação de produtos) e requisitos **RF-01 a RF-12**, **RNF-02**, **RNF-03** e **RNF-07** da especificação de IA (`docs/Baseline de IA.pdf`).
- **Evidência de validação:** `pytest -v` executado após a alteração com **25 testes aprovados e 0 falhas** (registrado em `docs/revisao-code-smells/long-method-modulo-ia.md`).

---

### REF-03 · Extração da checagem de posse da peça (Duplicated Code)
- **Commit:** `a59d926` (`extrai checagem de posse da peça em produto.service (code smell: duplicated code)`) · **Data:** 15/11/2026 · **Responsável:** Lara
- **Arquivos afetados:** `backend/app/src/services/produto.service.ts`, `backend/app/tests/produtos-posse.test.ts`
- **Relatório complementar:** [duplicated-code-produto-service.md](revisao-code-smells/duplicated-code-produto-service.md)
- **Problema encontrado e origem:** Identificado na revisão de code smells do backend. Os métodos `atualizar()`, `inativar()` e `atualizarEstoque()` repetiam o mesmo bloco de verificação de existência do produto e posse pela loja do artesão autenticado, aumentando o risco de divergência em uma regra crítica de autorização. Além disso, a regra de posse não possuía cobertura de testes automatizados.
- **Código antes e depois:**

Antes (bloco replicado em `atualizar`, `inativar` e `atualizarEstoque`):
```ts
const produto = await produtoRepository.buscarPorId(id);
if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
if (!loja || produto.lojaId !== loja.id) {
  throw new ErroApp(403, "Voce so pode atualizar suas proprias pecas.");
}
```

Depois (função centralizada `buscarProdutoDoArtesao` reutilizada nos três métodos):
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
}

async atualizarEstoque(id: string, dados: { estoque: number; situacao: string }, usuarioId: string) {
  const produto = await buscarProdutoDoArtesao(id, usuarioId, "Acesso negado.");
  // ... regra de estoque
}
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Function** para centralizar a regra de autorização em um único ponto sem modificar o contrato de respostas HTTP (200, 403 e 404). Antes de refatorar, foram criados 9 testes de caracterização em `backend/app/tests/produtos-posse.test.ts` cobrindo as três rotas (`PUT /produtos/:id`, `DELETE /produtos/:id` e `PUT /produtos/artesao/pecas/:id/estoque`).
- **Relação com requisitos e histórias:** **HU-01** (critérios 01.3 e 01.7, bloqueio por papel e acesso indevido), **HU-02**, **HU-12**, **HU-15** (critério 15.3, painel limitado à própria loja) e **RN02** (associação do produto ao artesão).
- **Evidência de validação:** Os 9 novos testes de caracterização passaram antes e depois da refatoração, e permaneceram verdes na rodada integrada do backend com PostgreSQL (**9/9 suítes, 134/134 testes**, `docs/testes/evidencia-integracao-banco.md`).

---

### REF-04 · Separação da apresentação dos cartões de pedido do artesão
- **Commit:** `e64e39e` (`separa apresentação dos cartões de pedido`) · **Data:** 15/11/2026 · **Responsável:** Carlos
- **Arquivos afetados:** `frontend/src/components/painel/PedidosArtesao.tsx`, `frontend/src/components/painel/PedidoArtesaoCard.tsx`
- **Problema encontrado e origem:** Durante a evolução do painel do artesão, `PedidosArtesao.tsx` passou a acumular a coordenação de filtros na URL, busca de dados, tratamento de estados de carregamento/erro/vazio e toda a renderização detalhada de cada pedido (status, rótulos, variantes de selo, formulário inline de código de rastreio e cópia para área de transferência), gerando um componente extenso e difícil de manter.
- **Código antes e depois:**

Antes (renderização completa do cartão e formulários embutidos dentro do `.map()` em `PedidosArtesao.tsx`):
```tsx
{pedidos.map((pedido) => {
  const aberto = expandido === pedido.id;
  return (
    <li key={pedido.id}>
      <Cartao>
        {/* ~100 linhas com status, itens, total, botão de ação,
            formulário de rastreio e visualização/cópia do código */}
      </Cartao>
    </li>
  );
})}
```

Depois (`PedidosArtesao.tsx` coordena filtros e ações; `PedidoArtesaoCard.tsx` isola a apresentação de cada item):
```tsx
{pedidos.map((pedido) => {
  const aberto = expandido === pedido.id;
  return (
    <li key={pedido.id}>
      <PedidoArtesaoCard
        pedido={pedido}
        aberto={aberto}
        codigoRastreio={rastreio[pedido.id] ?? ""}
        salvando={salvando === `pedido:${pedido.id}`}
        aoAbrir={abrir}
        aoAlterarRastreio={(pedidoId, codigo) =>
          setRastreio((atual) => ({ ...atual, [pedidoId]: codigo }))
        }
        aoSalvarRastreio={salvarRastreio}
        aoCancelarRastreio={() => setExpandido(null)}
        aoCopiarRastreio={copiarRastreio}
      />
    </li>
  );
})}
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Component**, separando o componente contêiner (`PedidosArtesao`) do componente apresentacional (`PedidoArtesaoCard`). Isso melhorou a legibilidade, isolou mapas de rótulos/variantes visuais junto ao cartão e facilitou ajustes visuais ou de acessibilidade sem mexer na lógica de filtros e mutações.
- **Relação com requisitos e histórias:** **HU-14** (Gestão de pedidos pelo artesão, critérios 14.1 a 14.3), **HU-15** (Painel de gestão do artesão) e **TC07**.
- **Evidência de validação:** Coberta pelo build, ESLint e suíte unitária do frontend (**14 suítes, 203/203 testes aprovados** e `npm run lint` / `npm run build` verdes em `docs/relatorios/2026-11-21-matriz-card-18.md`).

---

### REF-05 · Separação de configurações de envio e rastreio
- **Commit:** `4e25d29` (`separa configurações de envio do rastreio`) · **Data:** 15/11/2026 · **Responsável:** Allana
- **Arquivos afetados:** `frontend/src/components/painel/TransporteArtesao.tsx`, `frontend/src/components/painel/ConfiguracoesEnvio.tsx`, `frontend/src/components/painel/RastreioEtiqueta.tsx`
- **Problema encontrado e origem:** O componente `TransporteArtesao.tsx` concentrava quase 250 linhas misturando quatro preocupações distintas: estados globais da página, calculadora de frete com validação de CEP/peso/dimensões, ativação de opções de envio e orientações de embalagem, e consulta de pedidos enviados para emissão e impressão de etiqueta com código de rastreio.
- **Código antes e depois:**

Antes (`TransporteArtesao.tsx` mantinha todos os hooks, estados de formulário de frete, lista de pedidos e JSX das quatro seções):
```tsx
export default function TransporteArtesao() {
  const { dados, carregando, erro, recarregar } = useConfiguracoesEnvio();
  const { dados: pedidos } = usePedidosArtesao();
  const { alternarOpcaoEnvio, salvando, erro: erroDeAcao } = useAcoesArtesao();
  const { cotacao, calculando, erro: erroCotacao, calcular, limpar } = useCotacaoFrete();
  const [cep, setCep] = useState("");
  const [peso, setPeso] = useState("1,2");
  const [medidas, setMedidas] = useState("30 × 22 × 22");
  const [rastreio, setRastreio] = useState("");
  // ... validação de frete + 180 linhas de JSX com calculadora, opções, etiqueta e embalagem
}
```

Depois (`TransporteArtesao.tsx` reduzido à composição da página e tratamento de carregamento/erro):
```tsx
export default function TransporteArtesao() {
  const { dados, carregando, erro, recarregar } = useConfiguracoesEnvio();

  if (carregando) { /* Esqueleto */ }
  if (erro || !dados) { /* EstadoErro */ }

  return (
    <div className="flex flex-col gap-8">
      <TituloSecao
        titulo="Transporte e embalagem"
        descricao="A peça chega inteira ou não chegou. Calcule o frete, escolha como enviar e embale com cuidado."
      />

      <ConfiguracoesEnvio dados={dados} recarregar={recarregar} />
      <RastreioEtiqueta />
    </div>
  );
}
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Component** por domínio funcional: `ConfiguracoesEnvio` passou a agrupar cotação, opções, prazos por região e embalagem, enquanto `RastreioEtiqueta` isolou o hook de pedidos, o código de rastreio, as notificações e a impressão de etiqueta. Além de aumentar a coesão, a separação evita re-renderizações desnecessárias da área de frete quando o artesão edita o código de rastreio.
- **Relação com requisitos e histórias:** **HU-18** (Transporte e embalagem, critérios 18.1 a 18.3), **HU-14** (rastreio de envio) e **RN16** (regras de entrega).
- **Evidência de validação:** Verificada por `npm run lint`, `npm run build` (25 rotas compiladas) e execução da suíte unitária do frontend (**14 suítes, 203/203 testes aprovados** em `docs/relatorios/2026-11-21-matriz-card-18.md`).

---

### REF-06 · Extração da validação do formulário de cadastro (Long Function)
- **Commit:** `11b1f36` (`extrai validação do cadastro para função testada (code smell: long function)`) · **Data:** 16/11/2026 · **Responsável:** João Pedro
- **Arquivos afetados:** `frontend/src/components/conta/FormularioCadastro.tsx`, `frontend/src/lib/validacao.ts`, `frontend/tests/unit/validacao.test.ts`
- **Relatório complementar:** [long-function-formulario-cadastro.md](revisao-code-smells/long-function-formulario-cadastro.md)
- **Problema encontrado e origem:** Identificado na revisão de code smells do frontend. A função `enviar()` em `FormularioCadastro.tsx` tinha 43 linhas e misturava validação de campos por perfil (comprador, artesão e administrador), montagem de payload, chamada à API e feedback visual. As regras de validação estavam espalhadas em três lugares e os campos de técnica, região, convite administrativo e aceite de termos não tinham testes unitários.
- **Código antes e depois:**

Antes (regras de validação embutidas em `enviar()` dentro do componente de tela):
```ts
const novos: Erros = {
  nome: validarNome(nome),
  email: validarEmail(email),
  senha: validarSenhaNova(senha),
  tecnica: artesao && !tecnica ? "Escolha sua técnica principal." : undefined,
  regiao: artesao && !regiao ? "Escolha a região onde você produz." : undefined,
  convite: administrador ? validarConvite(convite) : undefined,
  termos: termos ? undefined : "Aceite os termos para criar a conta.",
};
```

Depois (função pura `validarCadastro` extraída para `frontend/src/lib/validacao.ts` e chamada em `enviar()`):
```ts
// Em FormularioCadastro.tsx:
const novos = validarCadastro({
  papel, nome, email, senha, tecnica, regiao, convite, termos,
});

// Em frontend/src/lib/validacao.ts:
export function validarCadastro(dados: DadosCadastro): ErrosCadastro {
  const artesao = dados.papel === "ARTESAO";
  const administrador = dados.papel === "ADMINISTRADOR";

  return {
    nome: validarNome(dados.nome),
    email: validarEmail(dados.email),
    senha: validarSenhaNova(dados.senha),
    tecnica: artesao && !dados.tecnica ? "Escolha sua técnica principal." : undefined,
    regiao: artesao && !dados.regiao ? "Escolha a região onde você produz." : undefined,
    convite: administrador ? validarConvite(dados.convite) : undefined,
    termos: dados.termos ? undefined : "Aceite os termos para criar a conta.",
  };
}
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Function** seguindo TDD (`docs/TDD.md`): primeiro foram escritos 11 novos testes unitários em `validacao.test.ts` (falhando antes da implementação) e depois as regras foram centralizadas em `validarCadastro()`, preservando integralmente as mensagens exibidas em `/cadastro`.
- **Relação com requisitos e histórias:** **HU-01** (Autenticação e perfis de acesso), **RN01** (unicidade de e-mail), **RN03** (integridade dos dados obrigatórios no cadastro), **TC01** e **TC08**.
- **Evidência de validação:** `validacao.test.ts` passou com **53/53 testes** (42 existentes + 11 novos), `npm run lint` e `npm run build` concluídos sem erros, além de conferência manual na tela `/cadastro` nos três perfis e aprovação posterior na rodada E2E (`acesso.cy.js`: 15/15).

---

### REF-07 · Centralização da montagem dos dados do artesão (Message Chains)
- **Commit:** `971a3a8` (`Melhorar manutenibilidade do serviço de produtos`) · **Data:** 16/11/2026 · **Responsável:** Samara
- **Arquivos afetados:** `backend/app/src/services/produto.service.ts`
- **Relatório complementar:** [message-chains-produto-service.md](revisao-code-smells/message-chains-produto-service.md)
- **Problema encontrado e origem:** Identificado na revisão de code smells do backend. Os métodos `listar()`, `buscarPorId()` e `listarPendentes()` repetiam acessos encadeados às propriedades `loja.usuario.id` e `loja.usuario.nome`, acoplando múltiplos pontos do serviço à navegação interna das relações Prisma. Durante a mesma revisão, foram corrigidos erros preexistentes de compilação ligados a `disponibilidadeDe()` e `situacaoDe()`.
- **Código antes e depois:**

Antes (encadeamento repetido em `listar`, `buscarPorId` e `listarPendentes`):
```ts
artesao: {
  id: produto.loja.usuario.id,
  nome: produto.loja.usuario.nome,
},
```

Depois (função auxiliar `dadosDoArtesao` reutilizada nos três métodos):
```ts
const dadosDoArtesao = (loja: any) => ({
  id: loja.usuario.id,
  nome: loja.usuario.nome,
});

// Em listar() e listarPendentes():
artesao: dadosDoArtesao(produto.loja),

// Em buscarPorId():
artesao: {
  ...dadosDoArtesao(produto.loja),
  loja: produto.loja.nome,
},
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Method** para concentrar a extração de identificação do artesão em um único ponto sem alterar o contrato JSON dos endpoints. O método `recomendados()` foi preservado intencionalmente por utilizar fallback específico para registros com relacionamentos opcionais.
- **Relação com requisitos e histórias:** **HU-03** (fila de validação de origem), **HU-04** (vitrine), **HU-05** (detalhes da peça e do artesão), **HU-07** (perfil do artesão), **RN02**, **RN08** e **TC03**.
- **Evidência de validação:** `npm run build` e `git diff --check` aprovados no momento do commit; testes de integração e unitários validados na sequência (`docs/testes/evidencia-integracao-banco.md`: 134/134 testes; `docs/2026-11-21-retomada-card-18-pos-correcoes.md`: `produto-service.unit.test.ts` e `recomendacoes.unit.test.ts` com 19/19 testes aprovados).

---

### REF-08 · Remoção de chamada obsoleta no hook de checkout (Dead Code)
- **Commit:** `281a454` (`remove chamada obsoleta do checkout`) · **Data:** 16/11/2026 · **Responsável:** Nicolas
- **Arquivos afetados:** `frontend/src/hooks/useCheckout.ts`
- **Problema encontrado e origem:** Após a migração dos serviços do frontend da Fake API para o backend real (commit `d4ceadd`), permaneceu em `useCheckout.ts` uma chamada obsoleta a `pedidosService.encerrarTentativaDemonstracao()`, método que não existia mais no serviço real de pedidos e quebrava o fluxo/compilação após aprovação do pagamento.
- **Código antes e depois:**

Antes:
```ts
if (processado.status === "APROVADO") {
  await carrinho.esvaziar();
  pedidosService.encerrarTentativaDemonstracao();
}
```

Depois:
```ts
if (processado.status === "APROVADO") {
  await carrinho.esvaziar();
}
```

- **Justificativa da solução adotada:** Remoção direta de código morto (**Remove Dead Code**) vinculado exclusivamente ao modo simulado antigo, mantendo `useCheckout.ts` coerente com o contrato real do backend Express.
- **Relação com requisitos, falhas e histórias:** **HU-09** (criação do pedido e checkout), **HU-10** (pagamento), **RN28 a RN31**, **TC06** e falha de integração da migração da Fake API (Card #18).
- **Evidência de validação:** Build do frontend sem erros de tipagem e fluxo de compra validado na suíte unitária (**203/203**) e no Cypress E2E (`compra.cy.js`: **10/10** na rodada de 21/11/2026).

---

### REF-09 · Limpeza de comentários redundantes na rota de pedidos
- **Commit:** `4f4a278` (`refactor: removi comentarios excessivos da rota dos pedidos`) · **Data:** 16/11/2026 · **Responsável:** Leandro
- **Arquivos afetados:** `backend/app/src/routes/pedidos.routes.ts`
- **Problema encontrado e origem:** O arquivo `pedidos.routes.ts` continha comentários linha acima de cada endpoint (`// POST /pedidos/checkout`, `// GET /pedidos/comprador/pedidos`, etc.) que apenas repetiam o método HTTP e o caminho já explícitos na declaração do roteador Express, poluindo a leitura do arquivo.
- **Código antes e depois:**

Antes:
```ts
// POST /pedidos/checkout
router.post(
  "/checkout",
  autenticar,
  exigirPapel("COMPRADOR"),
  validarCorpo(schemaCheckout),
  (req, res, next) => controller.checkout(req, res).catch(next)
);
```

Depois:
```ts
router.post(
  "/checkout",
  autenticar,
  exigirPapel("COMPRADOR"),
  validarCorpo(schemaCheckout),
  (req, res, next) => controller.checkout(req, res).catch(next)
);
```

- **Observação de rastreabilidade:** O commit original introduziu acidentalmente um caractere `0` ao final da linha `STATUS_FINAIS` em `backend/app/src/services/pedido.service.ts`, corrigido posteriormente durante a integração da `main` antes das rodadas finais de build e testes.
- **Justificativa da solução adotada:** Remoção de comentários redundantes para manter o código autoexplicativo nas rotas de pedidos, sem alterar middlewares de autenticação, autorização ou validação Zod.
- **Relação com requisitos e histórias:** **HU-09**, **HU-13**, **HU-14** e **RN15 a RN20** (rotas de checkout, acompanhamento e gestão de pedidos).
- **Evidência de validação:** Validado pelo build TypeScript do backend e pela suíte de integração (`backend/app/tests/pedidos.test.ts` dentro dos **134/134 testes aprovados** em `docs/testes/evidencia-integracao-banco.md`).

---

### REF-10 · Extração da tabela de gestão de estoque do artesão
- **Commit:** `1ae15de` (`extrai tabela de gestão do estoque`) · **Data:** 16/11/2026 · **Responsável:** Nicolas
- **Arquivos afetados:** `frontend/src/components/painel/EstoqueArtesao.tsx`, `frontend/src/components/painel/TabelaEstoqueArtesao.tsx`
- **Problema encontrado e origem:** Após a correção da gestão de estoque (`6058b3b`), o arquivo `EstoqueArtesao.tsx` cresceu para mais de 300 linhas acumulando filtros por situação na URL, contadores de aba, validação de quantidade inteira não negativa, estados inline de edição/pausa/exclusão e toda a marcação HTML da tabela responsiva.
- **Código antes e depois:**

Antes (`EstoqueArtesao.tsx` continha os estados `editando`, `novoEstoque`, `confirmando`, cinco handlers de edição/exclusão e a tabela completa inline):
```tsx
const [editando, setEditando] = useState<string | null>(null);
const [novoEstoque, setNovoEstoque] = useState("");
const [confirmando, setConfirmando] = useState<string | null>(null);
// ... abrirAjuste, salvarAjuste, alternarPausa, confirmarExclusao + ~180 linhas de <table>
```

Depois (`EstoqueArtesao.tsx` mantém filtros e busca; `TabelaEstoqueArtesao.tsx` encapsula a tabela e os fluxos inline de edição, pausa e exclusão):
```tsx
<TabelaEstoqueArtesao
  pecas={pecas}
  erroValidacao={erroValidacao}
  definirErroValidacao={setErroValidacao}
  salvando={salvando}
  alterarEstoque={alterarEstoque}
  removerPeca={removerPeca}
  limparErro={limparErro}
  aoRecarregar={recarregar}
/>
```

- **Justificativa da solução adotada:** Aplicada a técnica **Extract Component**, separando a coordenação de filtros/estados da página (`EstoqueArtesao`) da interação tabular por item (`TabelaEstoqueArtesao`). Isso reduziu o acoplamento interno e preservou integralmente as regras de bloqueio de estoque negativo, pausa e exclusão lógica.
- **Relação com requisitos e histórias:** **HU-12** (Gestão de estoque, critérios 12.1, 12.2 e 12.6), **HU-15** (Painel de gestão do artesão), **RN07**, **RN23 a RN25** e **TC05**.
- **Evidência de validação:** Validado pelo teste dedicado `frontend/tests/unit/estoque-artesao.test.tsx` (incluído nos **203/203 testes unitários aprovados**), `npm run lint`, `npm run build` e pelo E2E `cadastro-peca.cy.js` (**3/3**).

---

### REF-11 · Remoção de artefatos duplicados e alinhamento de stack
- **Commit:** `b99d1d7` (`ajusta compatibilidade da stack, remove artefatos duplicados e documenta auditoria`) · **Data:** 22/11/2026 · **Responsável:** Carlos
- **Arquivos afetados:** remoção de `prisma-validacao/`, atualização de `frontend/package.json`, `frontend/package-lock.json`, `backend/backend/Origem.Concorrencia/Program.cs`, `README.md`, criação de `docs/incompatibilidades-e-correcoes.md`
- **Problema encontrado e origem:** Identificado na auditoria de compatibilidade da stack. O repositório possuía uma pasta auxiliar `prisma-validacao/` com outro `schema.prisma` em versão divergente do Prisma (`6.19.3` contra `5.22.0` do backend), além da dependência `react-icons` no `frontend/package.json` (proibida explicitamente pelo `frontend/DESIGN.md`, que padroniza `lucide-react`) e de IDs da demo de concorrência desalinhados com o PostgreSQL.
- **Justificativa da solução adotada:** Remover a pasta duplicada eliminou o risco de divergência de schema; retirar `react-icons` garantiu conformidade com as regras visuais do projeto e reduziu dependências desnecessárias; aceitar tanto `prd_201` quanto `2001` em `Origem.Concorrencia/Program.cs` alinhou a demonstração ao banco real.
- **Relação com requisitos e diretrizes:** Requisitos não funcionais de manutenibilidade e conformidade arquitetural (`frontend/DESIGN.md`, `backend/app/prisma/schema.prisma`, ADR-001 e ADR-003).
- **Evidência de validação:** Auditoria registrada em `docs/incompatibilidades-e-correcoes.md`, mantendo `backend/app/prisma/schema.prisma` como fonte única de schema e `lucide-react` como biblioteca única de ícones.

---

## 3. Resumo consolidado dos resultados de testes após as refatorações

Os resultados abaixo consolidam as evidências de execução registradas no repositório após as alterações estruturais descritas acima:

| Camada / Suíte | Comando / Escopo | Resultado registrado | Fonte da evidência |
|---|---|---|---|
| **Frontend (Unitário)** | `npm run test:unit -- --runInBand` (Jest) | **14 suítes, 203/203 testes aprovados** (inclui `validacao.test.ts` e `estoque-artesao.test.tsx`) | `docs/relatorios/2026-11-21-matriz-card-18.md` e `docs/2026-11-21-retomada-card-18-pos-correcoes.md` |
| **Frontend (Qualidade e Build)** | `npm run lint`, `tsc --noEmit` e `npm run build` | **Aprovado** (exit 0, 25 rotas compiladas) | `docs/relatorios/2026-11-21-matriz-card-18.md` e `docs/2026-11-21-retomada-card-18-pos-correcoes.md` |
| **Backend (Integração + Banco)** | `npm test` (Jest + Supertest + PostgreSQL 17) | **9/9 suítes, 134/134 testes aprovados** em 17,5 s (inclui `produtos-posse.test.ts` e `pedidos.test.ts`) | `docs/testes/evidencia-integracao-banco.md` |
| **Backend (Unitário e Build)** | Jest unitário (`produto-service` e `recomendacoes`) + `npm run build` | **2/2 suítes, 19/19 testes aprovados** e build TypeScript exit 0 | `docs/2026-11-21-retomada-card-18-pos-correcoes.md` |
| **Módulo de IA** | `pytest -v` (`modulo-ia/tests`) | **25/25 testes aprovados, 0 falhas** | `docs/revisao-code-smells/long-method-modulo-ia.md` |
| **Ponta a ponta (E2E)** | Cypress (`acesso`, `cadastro-peca`, `compra`, `desempenho`, `vitrine`) | **42/42 cenários aprovados** (acesso 15/15, cadastro-peca 3/3, compra 10/10, desempenho 3/3, vitrine 11/11) | `docs/2026-11-21-retomada-card-18-pos-correcoes.md` |

---

## 4. Documentos relacionados

- [docs/revisao-code-smells/long-method-modulo-ia.md](revisao-code-smells/long-method-modulo-ia.md)
- [docs/revisao-code-smells/duplicated-code-produto-service.md](revisao-code-smells/duplicated-code-produto-service.md)
- [docs/revisao-code-smells/long-function-formulario-cadastro.md](revisao-code-smells/long-function-formulario-cadastro.md)
- [docs/revisao-code-smells/message-chains-produto-service.md](revisao-code-smells/message-chains-produto-service.md)
- [docs/incompatibilidades-e-correcoes.md](incompatibilidades-e-correcoes.md)
- [docs/testes/evidencia-integracao-banco.md](testes/evidencia-integracao-banco.md)
- [docs/relatorios/2026-11-21-matriz-card-18.md](relatorios/2026-11-21-matriz-card-18.md)
- [docs/2026-11-21-retomada-card-18-pos-correcoes.md](2026-11-21-retomada-card-18-pos-correcoes.md)
