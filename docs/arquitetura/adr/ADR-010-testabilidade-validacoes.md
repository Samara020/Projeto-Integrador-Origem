# ADR-010: Adotar separação em camadas com validações puras para melhorar a testabilidade do cadastro

- **Status:** Proposta
- **Data:** 2026-11-23
- **Autor:** JOAO PEDRO DO MONTE SOUZA (jpms6@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem possui cadastros de comprador, artesão e administrador, com regras específicas para cada perfil. A equipe é pequena, tem prazo de um semestre e precisa preservar a stack e o modelo de dados acordados nas disciplinas. O frontend já possui componentes, serviços de acesso à API e funções puras de validação. O commit 11b1f36 extraiu do formulário as regras por perfil, os termos e a composição das validações para validarCadastro. A prioridade é manter essas regras testáveis sem depender da interface ou de servidores

## Preocupações

Testabilidade, manutenibilidade, custo de mudança, duplicação de regras, consistência com o backend, prazo.

## Decisão

Manter a separação em camadas no frontend, isolando as regras de validação em funções puras, os serviços de acesso à API e os componentes de interface. Cada nova regra deverá ter testes unitários, enquanto o backend continuará responsável pela validação definitiva e pela autorização.

## Justificativa

Funções puras permitem testar entradas e resultados sem renderizar componentes ou executar backend e banco de dados. No cenário de mudança do tamanho mínimo da senha, a lógica é alterada em validarSenhaNova, seus testes são atualizados e a dica do formulário acompanha o novo limite. Essa separação permite verificar a regra isoladamente e buscar a meta de executar a suíte em menos de 5 segundos, sem chamadas de rede.

## Consequências

Ganhamos testes rápidos, reutilização das validações e maior facilidade para localizar o impacto das mudanças. Em contrapartida, há mais arquivos e é necessário manter coerência entre funções, mensagens da interface e regras do backend. Os testes unitários verificam os resultados das funções, mas não comprovam a apresentação dos erros na tela nem a integração com a API, que exigem verificações próprias.

## Alternativas consideradas

Portas e Adaptadores foi considerado, mas não escolhido para este recorte: as funções puras já permitem testar as validações sem criar interfaces e adaptadores adicionais. Manter as regras por perfil dentro do componente dificultaria seus testes isolados. Validar somente no backend reduziria a duplicação, mas exigiria uma requisição para informar cada erro ao usuário

## Rastreabilidade

**Atributo de qualidade:** Manutenibilidade · Testabilidade

**Cenário que originou a decisão:**

> Ao receber uma mudança no tamanho mínimo da senha do cadastro, acordada com a equipe do backend, um desenvolvedor do Origem atualiza a função validarSenhaNova, seus testes e a dica do formulário em ambiente de desenvolvimento local. Sem executar backend ou banco de dados nem renderizar a interface, a suíte verifica senhas abaixo, no limite e acima do mínimo e deve terminar em menos de 5 segundos, sem chamadas de rede e com todos os testes aprovados.

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Restringir dependências a uma direção; Usar intermediário entre camadas

frontend/src/lib/validacao.ts; frontend/tests/unit/validacao.test.ts; frontend/src/components/conta/FormularioCadastro.tsx; commit 11b1f36; docs/revisao-code-smells/long-function-formulario-cadastro.md. A suíte de validação possui testes relacionados aos casos TC01, TC06 e TC11.

## Verificação

- **Teste do cenário:** Atualizar os testes de validarSenhaNova para verificar senhas com comprimento imediatamente abaixo, igual e acima do mínimo definido. Executar a suíte validacao.test.ts sem backend ou banco de dados ativos e sem renderizar componentes. O cenário passa quando todos os testes são aprovados, os três limites são verificados, não há chamadas de rede e a execução termina em menos de 5 segundos. Conferir separadamente se a dica do formulário corresponde ao limite. A execução local atual aprovou 53 testes; a mudança hipotética de limite ainda não foi realizada.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
