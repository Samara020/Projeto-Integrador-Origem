# ADR-007: Adotar arquitetura em camadas no frontend com componentes base inclusivos e intermediários de estado

- **Status:** Proposta
- **Data:** 2026-11-22
- **Autor:** ALLANA SILVIA GADELHA DE CARVALHO SOUZA (asgcs@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem é desenvolvido por uma equipe pequena de estudantes no prazo de um semestre, com outras disciplinas em paralelo, sem orçamento para infraestrutura e seguindo a stack acordada (Next.js com Tailwind e Chakra UI no frontend, Express com Prisma no backend e PostgreSQL). Como a plataforma atende artesãos de diferentes idades e níveis de familiaridade digital que usam o painel pelo celular, garantir inclusividade nas telas de cadastro e venda é prioridade.

## Preocupações

inclusividade, legibilidade, responsividade mobile, consistência visual, manutenibilidade, prazo

## Decisão

Estruturar o frontend em camadas verticais, separando os tokens visuais e componentes base reutilizáveis (globals.css e components/ui/) das páginas, hooks de estado e serviços HTTP. Assim, telas como o cadastro de peças do artesão herdam contraste legível, áreas de toque adequadas, responsividade em 360 px e mensagens claras de erro padronizadas pelos hooks e por lib/http.ts.

## Justificativa

Encapsular as regras visuais e de interação na camada base garante que o formulário em /painel/artesao/pecas/nova mantenha contraste mínimo de 4,5:1, áreas de toque de pelo menos 40x40 px e zero rolagem horizontal em telas de 360 px sem depender de ajustes manuais em cada página. Ao mesmo tempo, usar hooks e lib/http.ts como intermediários padroniza estados de carregamento e mensagens de validação em português claro, ajudando o artesão a concluir o cadastro sem ajuda em até 3 minutos.

## Consequências

Ganha-se consistência visual e de acessibilidade em toda a plataforma, menos código repetido nos formulários e facilidade para evoluir as regras do DESIGN.md em um único ponto. Por outro lado, perde-se agilidade em ajustes pequenos, já que mudanças simples podem tocar mais de uma camada e gerar mais arquivos, além de exigir disciplina da equipe para evitar estilos soltos ou chamadas diretas à API nas páginas e cuidado extra ao alterar componentes base compartilhados.

## Alternativas consideradas

Considerei o padrão Microkernel pensando em oferecer recursos de inclusividade, como um modo simplificado para o artesão ou ajustes visuais, como extensões carregáveis sobre um núcleo fixo. Descartei porque no Origem a inclusividade precisa vir nativa na interface padrão para todos, e não como um complemento opcional, além de exigir uma estrutura de extensões que traria complexidade incompatível com o prazo de um semestre e o tamanho da equipe.

## Rastreabilidade

**Atributo de qualidade:** Capacidade de interação · Inclusividade

**Cenário que originou a decisão:**

> Em operação normal, usando um celular de tela pequena (360 px de largura), um artesão com pouca familiaridade digital acessa o frontend do painel do artesão (/painel/artesao/pecas) e seus componentes base de formulário para publicar um novo produto. O sistema exibe o formulário adaptado à tela, com texto legível, botões fáceis de tocar e mensagens de erro claras em português, garantindo zero rolagem horizontal em 360 px, contraste mínimo de 4,5:1, áreas de toque de pelo menos 40x40 px e conclusão do cadastro sem ajuda em até 3 minutos.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Usar intermediário entre camadas

Módulos e arquivos: frontend/DESIGN.md, frontend/src/app/globals.css, frontend/src/components/ui/ (Botao.tsx, Campo.tsx, Selecao.tsx, AreaTexto.tsx, EstadoErro.tsx, Esqueleto.tsx), frontend/src/app/painel/artesao/pecas/nova/page.tsx, frontend/src/hooks/usePainelArtesao.ts, frontend/src/services/painelArtesao.ts e frontend/src/lib/http.ts. Casos de teste: TC02 e TC12 (e2e/cypress/e2e/cadastro-peca.cy.js), frontend/tests/unit/validacao.test.ts e frontend/tests/unit/estados-e-sessao.test.tsx.

## Verificação

- **Teste do cenário:** Rodar o teste E2E e2e/cypress/e2e/cadastro-peca.cy.js (TC02 e TC12) configurado em viewport mobile de 360 px de largura para verificar automaticamente ausência de rolagem horizontal (scrollWidth <= clientWidth), áreas de toque de pelo menos 40x40 px nos campos e botões e exibição clara das mensagens de erro em português, somado à checagem de contraste mínimo de 4,5:1 (via Lighthouse ou axe) e a um teste rápido de usabilidade medindo a conclusão do cadastro sem ajuda em até 3 minutos.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
