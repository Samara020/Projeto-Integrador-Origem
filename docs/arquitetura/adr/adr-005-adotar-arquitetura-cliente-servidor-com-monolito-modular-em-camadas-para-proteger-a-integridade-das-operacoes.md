# ADR-005: Adotar arquitetura cliente-servidor com monólito modular em camadas para proteger a integridade das operações.

- **Status:** Proposta
- **Data:** 2026-11-21
- **Autor:** SAMARA MENDONCA NUNES (smn@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem é um marketplace desenvolvido em um semestre acadêmico por uma equipe enxuta de estudantes, sob restrições de hospedagem sem orçamento de infraestrutura e seguindo a stack acordada entre as disciplinas: Next.js no frontend, Express com Node.js na API REST do backend e PostgreSQL com Prisma ORM na persistência. Como a plataforma conecta compradores, artesãos e administradores pela internet, proteger a integridade dos dados transacionais e o isolamento de recursos por loja é prioridade máxima.

## Preocupações

Integridade, autorização, isolamento de recursos, custo de manutenção, prazo e testabilidade.

## Decisão

Centralizar as regras de negócio, autenticação, autorização e persistência no backend em Node.js e Express, estruturado como um monólito modular organizado em camadas. O backend expõe ao cliente Next.js apenas uma API REST protegida por autenticação JWT, controle de acesso baseado em papéis e verificações de posse dos recursos antes das operações que os modificam.

## Justificativa

Essa estrutura atende diretamente ao cenário de integridade porque impede o acesso direto do cliente ao PostgreSQL, valida a identidade e o papel do usuário na borda da API por meio de middlewares antes de acionar os controladores, verifica a posse do recurso nas camadas de serviço antes de qualquer alteração em produtos ou pedidos e executa transações atômicas na baixa de estoque, contribuindo para bloquear requisições não autorizadas entre lojas, com respostas HTTP 403 ou 404 conforme o caso.

## Consequências

Ganha-se centralização das regras de negócio e dos controles de acesso no servidor, além de simplicidade de implantação em uma única unidade de backend e maior facilidade para executar testes de integração automatizados nos fluxos de autorização. Em contrapartida, aceita-se o custo de manter disciplina estrita para que módulos não acessem diretamente estruturas internas uns dos outros nem concentrem regras nas rotas ou nos controladores, além do cuidado para evitar que o Prisma ORM e as integrações externas de frete e pagamento fiquem espalhados pelo código.

## Alternativas consideradas

Foram descartadas a arquitetura orientada a eventos e o padrão CQRS. Embora pudessem desacoplar notificações e fluxos assíncronos, introduziriam desafios adicionais de consistência transacional, ordenação, idempotência e depuração incompatíveis com o prazo de um semestre, o tamanho da equipe e a ausência de demanda atual por escala elevada ou separação entre modelos de leitura e escrita.

## Rastreabilidade

**Atributo de qualidade:** Segurança (security) · Integridade

**Cenário que originou a decisão:**

> Em operação normal, com múltiplas lojas ativas e usuários autenticados realizando transações simultaneamente, um artesão autenticado via token JWT envia uma requisição HTTP PATCH ou PUT tentando atualizar o status de um pedido ou modificar os dados de um produto pertencente a outra loja por meio da manipulação do identificador na rota, atingindo a API REST do backend, especificamente os endpoints protegidos de pedidos e produtos, suas camadas de serviço em pedido.service.ts e produto.service.ts e o banco de dados PostgreSQL. Como resposta, o backend valida o token e o papel do usuário, verifica a posse do recurso e bloqueia a operação retornando HTTP 403 ou 404, conforme a política de exposição de recursos, sem persistir alterações no banco de dados nem expor dados da loja alheia, além de registrar a tentativa em log de auditoria como melhoria arquitetural prevista. A medida de sucesso é o bloqueio de 100% das tentativas de alteração cruzada nos cenários cobertos pelos testes automatizados de integração, com zero registros modificados indevidamente no banco de dados e tempo de resposta inferior a 500 milissegundos nos cenários de teste, como meta de desempenho a ser validada.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Centralizar regra e dado no servidor; Autenticar e autorizar na borda; Limitar a exposição da API

Módulos e arquivos de referência no repositório: middlewares de autenticação e autorização (auth.ts), serviços de domínio e posse de recursos (produto.service.ts e pedido.service.ts), repositório transacional de pedidos e estoque (pedido.repository.ts), além das evoluções previstas de revalidação de preço no checkout e trilha de auditoria.

## Verificação

- **Teste do cenário:** A decisão será validada por inspeção estrutural das camadas e módulos no repositório do backend — confirmando o isolamento entre rotas, controladores, serviços, repositórios Prisma e fronteiras internas — somada a uma suíte de testes automatizados de integração via Jest e Supertest sobre um banco PostgreSQL de testes. Os testes deverão autenticar um artesão via JWT e enviar requisições HTTP PATCH e PUT com identificadores de produtos e pedidos pertencentes a outra loja, verificando o retorno HTTP 403 ou 404 em 100% dos cenários cobertos, a ausência de alterações indevidas no banco de dados e o tempo de resposta inferior a 500 milissegundos como meta de desempenho a ser validada.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
