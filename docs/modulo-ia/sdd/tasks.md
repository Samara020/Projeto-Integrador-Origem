# tasks.md — Plano de Implementação

Extraído de `docs/Baseline de IA.pdf` (seção 2.4, SDD). Coerente com `requirements.md`, `design.md` e `product.md`.

## 2.4.1 Preparação do projeto

- Revisar o escopo do módulo de recomendação.
- Confirmar os requisitos funcionais RF-01 a RF-12.
- Confirmar os requisitos não funcionais RNF-01 a RNF-09.
- Definir a estrutura de pastas do módulo.
- Configurar o ambiente de desenvolvimento compatível com o projeto Origem.
- Confirmar a integração com o sistema principal.

## 2.4.2 Estrutura e configuração da API

- Criar a API `POST /recommendations`.
- Definir o contrato de entrada da API.
- Implementar os campos opcionais `product_id`, `category`, `technique` e `region`.
- Implementar o campo `limit`, com valor padrão de 5 e limite máximo de 20.
- Definir o formato da resposta com `recommendations[]`.
- Retornar `product_id`, `score` e `reason` nas recomendações.
- Implementar os códigos de erro 400, 401, 403, 404, 500 e 503.

## 2.4.3 Validação, segurança e privacidade

- Validar os dados recebidos antes do processamento.
- Verificar a existência do produto de referência, quando informado.
- Implementar autenticação e autorização na interface de integração.
- Utilizar somente os dados necessários e atributos públicos dos produtos.
- Evitar o processamento de dados pessoais dos compradores.
- Evitar dados pessoais desnecessários nos registros de observabilidade.

## 2.4.4 Implementação da recomendação

- Consultar os produtos candidatos no catálogo do Origem.
- Considerar somente produtos disponíveis.
- Excluir o produto de referência da lista de candidatos.
- Comparar categoria, técnica, região e demais atributos disponíveis.
- Implementar a estratégia baseada em conteúdo.
- Implementar o cálculo da relação entre o contexto e os candidatos.
- Ordenar os candidatos conforme a relação calculada.
- Retornar a quantidade solicitada de recomendações.
- Informar uma justificativa baseada nos atributos utilizados.

## 2.4.5 Implementação do fallback

- Aplicar o fallback progressivamente, mantendo a exclusão do produto de referência e de produtos indisponíveis, seguindo a ordem:
  1. Categoria, técnica e região;
  2. Categoria e técnica;
  3. Categoria e região;
  4. Categoria;
  5. Lista vazia, caso não existam candidatos elegíveis.
- Garantir que o fallback seja aplicado até atingir a quantidade solicitada ou até esgotar os critérios disponíveis.

## 2.4.6 Integração com o sistema Origem

- Integrar a API ao sistema Origem por meio da interface INT-01.
- Integrar o módulo à página de detalhes do produto.
- Criar a seção "Você também pode gostar".
- Implementar o carregamento assíncrono das recomendações.
- Exibir os produtos e as justificativas retornadas pela API.
- Tratar respostas de erro e indisponibilidade da API.
- Ocultar a seção de recomendações quando o serviço estiver indisponível.

> Nota de rastreabilidade (card 2): o contrato atual do Origem usa baseline local no backend na indisponibilidade; não se altera o backend para esconder sugestões por conta desse trecho histórico.

## 2.4.7 Desempenho e observabilidade

- Verificar o tempo de resposta de até 1 segundo em condições normais (RNF-01).
- Avaliar o desempenho para um catálogo de até 10.000 produtos ativos.
- Verificar se pelo menos 95% das requisições respondem em até 2 segundos sob carga (RNF-09).

> Nota de rastreabilidade (card 2): o benchmark interno disponível mede a lógica de rank, não carga HTTP com serviço/banco reais; não comprova o SLA HTTP de RNF-09. Validação ainda necessária.

- Registrar volume, erros, tempo de resposta e quantidade de resultados.
- Garantir que os registros não contenham dados pessoais desnecessários.

> Nota de rastreabilidade (cards 43/44): os indicadores de filtros aplicados, soma de sugestões do batch, recomendações vazias individuais, falhas PostgreSQL sem vazar credenciais e latências agregadas foram implementados e validados pelo reteste independente (`docs/modulo-ia-dados-e-monitoramento.md`, 272 casos únicos aprovados), deixando de constar como pendentes.

## 2.4.8 Testes

- Testar o recebimento de produto de referência e filtros.
- Testar entradas inválidas.
- Testar autenticação e autorização.
- Testar a exclusão do produto de referência.
- Testar a filtragem de produtos indisponíveis.
- Testar a ordenação dos candidatos.
- Testar o limite padrão de 5 e o limite máximo de 20 recomendações.
- Testar a geração das justificativas.
- Testar o funcionamento do fallback e o retorno de lista vazia.
- Testar os códigos de erro 400, 401, 403, 404, 500 e 503.
- Testar a ocultação da seção em caso de indisponibilidade.
- Testar o tempo de resposta em condições normais e sob carga.

## 2.4.9 Documentação e validação final

- Documentar o contrato da interface INT-01, incluindo entradas, saídas e erros.
- Atualizar o diagrama de componentes e o fluxo dos dados, se necessário.
- Verificar a consistência entre `product.md`, `requirements.md`, `design.md` e `tasks.md`.
- Confirmar que todos os requisitos do Documento de Requisitos aparecem em `requirements.md`.
- Confirmar que os identificadores dos requisitos foram preservados.
- Revisar riscos, limitações, privacidade, segurança e possíveis vieses.
- Realizar a revisão final do grupo.
