# ADR-006: Adotar arquitetura em camadas com barreira de autenticação e autorização na API do Origem

- **Status:** Proposta
- **Data:** 2026-11-22
- **Autor:** CARLOS HENRIQUE GONCALVES DA SILVA (chgs@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem é desenvolvido por uma equipe de 8 estudantes do 4º semestre de ADS, com prazo limitado ao semestre letivo e integração entre múltiplas disciplinas (Desenvolvimento Web, Banco de Dados, Requisitos/Validação, Concorrência e IA). A aplicação usa Next.js no frontend, Node.js/Express com Prisma no backend e PostgreSQL, lidando com dados pessoais e transacionais (CPF, endereço, pedidos e credenciais) que exigem controle rigoroso de acesso entre compradores, artesãos e administradores.

## Preocupações

confidencialidade, controle de acesso, conformidade com LGPD, testabilidade, prazo, simplicidade de manutenção

## Decisão

Estruturar o backend em camadas verticais (routes/middlewares, controllers, services e repositories), obrigando toda requisição protegida a passar pelos middlewares de validação JWT/papel e pela verificação de titularidade no service antes de acessar os repositórios e o PostgreSQL. No frontend, manter o acesso centralizado em components → hooks → services → lib/http.ts, sem expor segredos ou acesso direto ao banco.

## Justificativa

Essa organização atende diretamente ao cenário da etapa 2 porque cria uma barreira intermediária obrigatória antes da leitura de dados sensíveis. Qualquer tentativa de chamar GET /pedidos/{id} sem token válido, com papel indevido ou informando o pedido de outro comprador é interceptada nos middlewares ou no pedidoService, garantindo bloqueio de 100% das tentativas com status 401 ou 403, sem expor CPF, endereço ou itens e com rejeição rápida abaixo de 200 ms.

## Consequências

Ganhos: centralização das regras de autenticação e autorização, menor risco de vazamento acidental de dados pessoais, facilidade de onboarding para a equipe e testabilidade isolada de cada camada. Perdas: pequeno acréscimo de latência por requisição, maior volume de arquivos e código repetitivo (boilerplate) em operações simples onde uma camada apenas repassa a chamada para a próxima.

## Alternativas consideradas

Portas e Adaptadores (arquitetura hexagonal) foi considerada e descartada por exigir criação de interfaces e adaptadores extras para desacoplar o domínio do Express e do Prisma, aumentando o esforço dentro do prazo do semestre sem trazer benefício direto ao bloqueio de acessos não autorizados. Acesso direto ao banco pelas rotas também foi descartado por facilitar falhas de autorização e exposição de dados.

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Confidencialidade

**Cenário que originou a decisão:**

> Operação normal do marketplace, um comprador autenticado ou agente externo tentando acessar dados que pertencem a outro usuário. Envio de uma requisição HTTP GET /pedidos/{id} informando o identificador do pedido de outro comprador, ou utilizando um token JWT ausente, expirado ou revogado. API do backend principal e os e os dados pessoais armazenados no PostgreSQL.. O sistema valida o token JWT e confirma se o usuário autenticado é o titular do pedido; caso não seja, bloqueia a requisição retornando HTTP 401 ou 403 sem incluir dados do pedido no corpo da resposta e registra a tentativa sem gravar tokens ou senhas em log., 100% das tentativas não autorizadas bloqueadas com status 401 ou 403, zero campos pessoais expostos na resposta e tempo de rejeição inferior a 200 ms..

**Padrão arquitetural adotado:** Camadas

**Táticas empacotadas:** Encapsular responsabilidades por faixa; Usar intermediário entre camadas

Módulos: backend/app/src/middleware/auth.ts, backend/app/src/routes/pedidos.routes.ts, backend/app/src/services/pedido.service.ts, backend/app/src/repositories/pedido.repository.ts, frontend/src/lib/http.ts. Casos de teste: TC08 (frontend/tests/unit/guarda-papel.test.tsx), backend/app/tests/auth-permissoes.test.ts e backend/app/tests/pedidos.test.ts.

## Verificação

- **Teste do cenário:** Executar testes automatizados de integração com Jest e Supertest (backend/app/tests/auth-permissoes.test.ts e backend/app/tests/pedidos.test.ts) enviando requisições GET /pedidos/{id} em três casos: sem token, com token inválido/revogado e com token de outro comprador. Validar que 100% das chamadas retornam HTTP 401 ou 403 em menos de 200 ms, que o corpo da resposta contém apenas a mensagem de erro (0 campos pessoais como CPF, endereço ou itens) e que nenhuma credencial é registrada nos logs.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
