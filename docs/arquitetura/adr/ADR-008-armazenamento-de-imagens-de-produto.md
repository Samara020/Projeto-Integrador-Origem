# ADR-008 — Separar arquivos de imagem dos dados transacionais

- **Status:** Proposta
- **Data:** 22/11/2026
- **Responsável pelo registro:** Nicolas de Castro Albuquerque Natário (ncan@cesar.school)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

Artesãos cadastram peças com fotos que aparecem na vitrine, no detalhe do produto, no carrinho e nos pedidos. Hoje o frontend compacta arquivos selecionados e pode enviá-los como data URI; a API também aceita URLs HTTP(S) e caminhos relativos. O backend limita cada produto a seis imagens, com até 1,5 MB por imagem e 8 MB no conjunto. O PostgreSQL mantém registros de imagem associados ao produto e o campo `url` pode receber essas representações.

Esse fluxo mistura metadados do catálogo com conteúdo binário codificado em texto. Imagens em Base64 aumentam o tamanho transmitido e armazenado, elevam o custo de leitura do banco em listagens e tornam cópias e restaurações mais pesadas. Ao mesmo tempo, o projeto é acadêmico, tem prazo e orçamento limitados; a solução precisa evitar infraestrutura operacional desnecessária.

## Atributo de qualidade

**Desempenho e escalabilidade do catálogo.** A leitura de produtos e pedidos deve carregar metadados sem transferir os bytes completos das imagens pelo banco de dados.

## Cenário de qualidade

Durante o cadastro de uma peça com até seis fotos, o artesão envia imagens ao sistema. A API valida formato e limites, armazena os arquivos em um serviço de objetos compatível com HTTPS e grava no PostgreSQL somente as URLs canônicas e os metadados necessários. Depois, a vitrine e as telas de detalhe consultam o catálogo e carregam as imagens diretamente pelas URLs, sem incluir conteúdo Base64 nas respostas JSON do catálogo.

**Medida de sucesso:** respostas de listagem e detalhe não contêm data URIs nem bytes de imagem; cada imagem cadastrada continua acessível por sua URL após uma nova consulta; falha no armazenamento impede a criação de uma referência inválida no catálogo.

## Decisão

Adotar, quando houver infraestrutura aprovada, armazenamento de objetos para os bytes das imagens e manter no PostgreSQL apenas a relação da imagem com o produto, sua URL HTTPS canônica e metadados indispensáveis. O backend continuará sendo a fronteira de autorização e validação: somente usuários autorizados poderão associar imagens aos próprios produtos.

A migração será gradual. Enquanto o serviço de objetos não estiver disponível e operado pela equipe, o fluxo atual poderá permanecer ativo. A API deverá continuar lendo imagens legadas durante a transição; novos uploads só poderão usar o armazenamento externo depois de definidos credenciais fora do repositório, política de acesso, limites, remoção e recuperação de falhas. Não se deve gravar uma URL no produto antes de confirmar que o objeto foi armazenado.

## Justificativa

Separar arquivos dos dados transacionais reduz o volume de conteúdo repetido em respostas e permite que o navegador obtenha imagens sem carregar os bytes do PostgreSQL. URLs estáveis também preservam o contrato atual de catálogo, que já representa imagens por referências textuais. A adoção fica condicionada à disponibilidade de um serviço operável, porque adicionar um provedor externo sem orçamento, credenciais e política de retenção transferiria o risco para a equipe em vez de resolvê-lo.

## Alternativas consideradas

1. **Manter data URIs no PostgreSQL:** não exige serviço adicional e já é aceito pelo fluxo atual, mas Base64 aumenta payloads e mistura arquivos com dados transacionais.
2. **Salvar arquivos no disco local da API:** implementação simples, mas arquivos locais não são compartilhados automaticamente entre instâncias e podem se perder em reinícios, substituição de containers ou restauração incompleta.
3. **Usar armazenamento de objetos com URLs HTTPS:** separa os bytes do catálogo e pode ser compartilhado entre instâncias; exige configuração, controle de acesso, custo, observabilidade e política de ciclo de vida.
4. **Usar um CDN sem definir a origem dos arquivos:** melhora a distribuição, mas não resolve o armazenamento, a autorização de upload nem a consistência entre arquivo e registro no banco.

## Consequências

### Benefícios esperados

- Respostas de catálogo e pedidos carregam referências pequenas em vez de imagens codificadas.
- As imagens podem ser servidas por uma infraestrutura própria para arquivos e cache.
- A API mantém controle sobre quem pode cadastrar, substituir ou remover imagens de uma peça.
- A relação `Imagem` continua ligada ao produto no PostgreSQL, preservando consultas e ordenação do catálogo.

### Custos e riscos

- Surge dependência operacional e financeira de um serviço de armazenamento de objetos.
- O upload e a criação da referência precisam tratar falhas parciais para não deixar arquivo órfão ou URL sem objeto.
- Exclusão de produto, substituição de imagem e retenção precisam definir a remoção dos objetos correspondentes.
- Imagens antigas em data URI exigem migração ou leitura compatível enquanto forem necessárias.
- URLs públicas podem expor conteúdo; imagens privadas ou em revisão exigem política de acesso apropriada.
- Backup do PostgreSQL deixa de ser suficiente para restaurar o catálogo completo; arquivos e banco precisam de estratégia coordenada de backup.

## Verificação

1. Cadastrar produto com imagens válidas e confirmar que o banco guarda URLs/metadados, não data URIs de novos uploads.
2. Consultar catálogo, detalhe, carrinho e histórico e confirmar que as respostas JSON contêm referências e continuam compatíveis com o frontend.
3. Simular indisponibilidade do armazenamento antes e depois do upload; confirmar ausência de referência quebrada e política definida para objetos órfãos.
4. Verificar autorização: artesão não consegue associar, substituir ou remover imagens de produto de outra loja.
5. Excluir ou substituir uma imagem e confirmar a política de retenção/remoção sem apagar objetos ainda referenciados.
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

_Registro individual elaborado a partir do estudo dirigido de Arquitetura de Software · ADS020 · 2026.2; proposta independente dos ADRs de persistência geral, Fake API, concorrência, sessão e monólito em camadas._
