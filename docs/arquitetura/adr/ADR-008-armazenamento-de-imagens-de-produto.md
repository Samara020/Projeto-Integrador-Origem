# ADR-008: Separar arquivos de imagem dos dados transacionais

- **Status:** Proposta
- **Data da decisão:** 22/11/2026
- **Data deste registro:** 23/11/2026
- **Autor:** Nicolas de Castro Albuquerque Natário (ncan@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

Artesãos cadastram peças com fotos que aparecem na vitrine, no detalhe do produto, no carrinho e nos pedidos. Hoje o frontend compacta os arquivos selecionados e pode enviá-los como data URI; a API também aceita URLs HTTP(S) e caminhos relativos. O backend limita cada produto a seis imagens, com até 1,5 MB por imagem e 8 MB no conjunto. O PostgreSQL mantém os registros de imagem associados ao produto, e o campo `url` pode receber essas representações.

Esse fluxo mistura metadados do catálogo com conteúdo binário codificado em texto. Imagens em Base64 aumentam o tamanho transmitido e armazenado, elevam o custo de leitura do banco em listagens e tornam cópias e restaurações mais pesadas. O projeto é acadêmico e tem prazo e orçamento limitados; a solução precisa evitar infraestrutura operacional desnecessária.

## Atributo de qualidade

**Eficiência de desempenho — desempenho e escalabilidade do catálogo.** A leitura de produtos e pedidos deve carregar os metadados sem transferir os bytes completos das imagens pelo banco de dados. O cenário usa o comportamento temporal como foco, sem definir um limite de latência que ainda não foi medido.

## Cenário de qualidade

Durante o cadastro de uma peça com até seis fotos, cada uma de até 1,5 MB e 8 MB no conjunto, o artesão envia as imagens. A API valida formato e limites, armazena os arquivos em um serviço de objetos compatível com HTTPS e grava no PostgreSQL somente as URLs canônicas e os metadados necessários. Depois, a vitrine e as telas de detalhe consultam o catálogo e carregam as imagens pelas URLs, sem incluir conteúdo Base64 nas respostas JSON.

**Medida de sucesso:** respostas de listagem e detalhe não contêm data URIs nem bytes de imagem; cada imagem permanece acessível pela URL após uma nova consulta; uma falha no armazenamento impede a criação de uma referência inválida no catálogo.

## Decisão

Adotar armazenamento de objetos para os bytes das imagens quando houver infraestrutura aprovada e operada pela equipe. Manter no PostgreSQL a relação da imagem com o produto, sua URL HTTPS canônica e os metadados indispensáveis. O backend continuará sendo a fronteira de autorização e validação: somente usuários autorizados poderão associar imagens aos próprios produtos.

A migração será gradual. Enquanto o serviço de objetos não estiver disponível, o fluxo atual poderá permanecer ativo e a API continuará lendo imagens legadas. Novos uploads só usarão o armazenamento externo depois de definidos credenciais fora do repositório, política de acesso, limites, remoção e recuperação de falhas. A API não deve gravar uma URL no produto antes de confirmar que o objeto foi armazenado.

## Justificativa

Separar arquivos dos dados transacionais reduz o volume de conteúdo repetido nas respostas e permite que o navegador obtenha as imagens sem carregar seus bytes do PostgreSQL. URLs estáveis preservam o contrato atual do catálogo, que já representa imagens por referências textuais. A adoção depende de um serviço operável: adicionar um provedor sem orçamento, credenciais e política de retenção transferiria o risco para a equipe em vez de resolvê-lo.

## Consequências

### Benefícios esperados

- Respostas de catálogo e pedidos carregam referências pequenas em vez de imagens codificadas.
- As imagens podem ser servidas por uma infraestrutura própria para arquivos e cache.
- A API mantém controle sobre quem pode cadastrar, substituir ou remover imagens de uma peça.
- A relação `Imagem` continua ligada ao produto no PostgreSQL, preservando consultas e ordenação do catálogo.

### Custos e riscos

- Surge dependência operacional e financeira de um serviço de armazenamento de objetos.
- Upload e criação da referência precisam tratar falhas parciais para evitar arquivo órfão ou URL sem objeto.
- Exclusão de produto, substituição de imagem e retenção precisam definir a remoção dos objetos correspondentes.
- Imagens antigas em data URI exigem migração ou leitura compatível durante a transição.
- URLs públicas podem expor conteúdo; imagens privadas ou em revisão exigem política de acesso apropriada.
- Backup do PostgreSQL deixa de ser suficiente para restaurar o catálogo completo; arquivos e banco precisam de estratégia coordenada de backup.

## Alternativas consideradas

1. **Manter data URIs no PostgreSQL:** não exige serviço adicional e já é aceito pelo fluxo atual, mas Base64 aumenta payloads e mistura arquivos com dados transacionais.
2. **Salvar arquivos no disco local da API:** a implementação é simples, mas arquivos locais não são compartilhados automaticamente entre instâncias e podem se perder em reinícios, substituição de containers ou restauração incompleta.
3. **Usar armazenamento de objetos com URLs HTTPS:** separa os bytes do catálogo e pode ser compartilhado entre instâncias; exige configuração, controle de acesso, custo, observabilidade e política de ciclo de vida.
4. **Usar um CDN sem definir a origem dos arquivos:** melhora a distribuição, mas não resolve o armazenamento, a autorização de upload nem a consistência entre arquivo e registro no banco.

## Rastreabilidade

O fluxo mantém o modelo cliente-servidor existente: o frontend solicita operações e o backend valida formato, limites e autorização. Esta decisão não introduz um padrão GoF nem muda a arquitetura geral do sistema.

Módulos relacionados: catálogo, detalhe do produto, carrinho, pedidos, validação e persistência das imagens. As táticas relevantes são centralizar a regra e a autorização no servidor e evitar enviar os bytes das imagens nas respostas do catálogo.

## Verificação

1. Cadastrar produto com imagens válidas e confirmar que novos uploads gravam URLs e metadados, não data URIs.
2. Consultar catálogo, detalhe, carrinho e histórico e confirmar que as respostas JSON contêm referências e continuam compatíveis com o frontend.
3. Simular indisponibilidade do armazenamento antes e depois do upload; confirmar ausência de referência quebrada e uma política definida para objetos órfãos.
4. Verificar autorização: um artesão não consegue associar, substituir ou remover imagens de produto de outra loja.
5. Excluir ou substituir uma imagem e confirmar a política de retenção e remoção sem apagar objetos ainda referenciados.
6. Restaurar uma cópia de teste do banco e dos objetos e confirmar que as imagens do catálogo continuam acessíveis.
7. Comparar o tamanho das respostas de catálogo antes e depois, confirmando que não carregam os bytes das imagens.

Os testes devem usar ambiente descartável e imagens sintéticas sem dados pessoais. A decisão só deve ser considerada implementada depois de selecionar e aprovar o provedor, os limites, a política de acesso e o processo de backup.

## Evidências e referências do projeto

- `frontend/src/lib/imagem.ts` — leitura e compactação de imagens no navegador.
- `backend/app/src/lib/imagens.ts` — validação de formato, quantidade e tamanho.
- `backend/app/src/routes/produtos.routes.ts` — validação das imagens recebidas na API.
- `backend/app/src/repositories/produto.repository.ts` — associação dos registros de imagem aos produtos.
- `backend/app/prisma/schema.prisma`, modelo `Imagem` — metadados e relação persistida com o produto.
- `docs/ContratoDeAPI.md` — formato das imagens nas respostas da API.

---

_Registro individual elaborado a partir do estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
