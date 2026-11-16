# Revisão de Code Smells — Message Chains

## 1. Identificação

- Arquivo: backend/app/src/services/produto.service.ts
- Code Smell: Message Chains
- Refatoração aplicada: Extract Method
- Métodos analisados: listar(), buscarPorId() e listarPendentes()

## 2. Problema identificado

Foram identificados acessos encadeados às propriedades loja.usuario.id e loja.usuario.nome em diferentes métodos do serviço de produtos.

Essa repetição faz com que diferentes partes do código conheçam a estrutura interna dos relacionamentos entre produto, loja e usuário.

Caso a estrutura utilizada para obter os dados do artesão seja alterada, os diferentes pontos de acesso poderão exigir modificações.

## 3. Decisão técnica

Foi considerada adequada a refatoração porque a construção dos dados básicos do artesão estava repetida em três métodos.

A decisão foi aplicar a técnica Extract Method, extraindo a responsabilidade de montar esses dados para uma função auxiliar.

A refatoração foi realizada para reduzir a repetição e centralizar a construção das informações do artesão, mantendo o comportamento e o formato das respostas existentes.

## 4. Refatoração realizada

Foi criada a função auxiliar dadosDoArtesao():

    const dadosDoArtesao = (loja: any) => ({
      id: loja.usuario.id,
      nome: loja.usuario.nome,
    });

A função passou a ser utilizada nos seguintes métodos:

- listar(): substituição da montagem repetida do objeto artesao pela chamada dadosDoArtesao(produto.loja).
- buscarPorId(): reutilização da função com o operador spread, preservando a propriedade adicional loja, que contém o nome da loja.
- listarPendentes(): substituição da montagem repetida do objeto artesao pela chamada dadosDoArtesao(p.loja).

O método recomendados() foi mantido sem alterações porque utiliza encadeamento opcional e valores de fallback. Sua implementação trata situações em que os dados de loja ou usuário podem não estar disponíveis.

Alterar esse método para utilizar a nova função poderia modificar o comportamento existente, especialmente em relação aos valores padrão utilizados quando os dados estão ausentes.

## 5. Benefícios da refatoração

A refatoração apresenta os seguintes benefícios:

- Redução da duplicação de código: elimina a repetição da montagem dos dados básicos do artesão nos três métodos analisados.
- Centralização da responsabilidade: concentra a construção das informações de identificação do artesão em uma única função.
- Facilidade de manutenção: alterações futuras na montagem desses dados poderão ser realizadas em um único ponto.
- Melhoria da legibilidade: os métodos ficam mais objetivos, deixando mais clara a intenção de obter os dados do artesão.
- Preservação do comportamento: mantém a estrutura das respostas dos métodos, incluindo a propriedade adicional loja em buscarPorId().

É importante destacar que a refatoração centraliza o acesso às propriedades, mas não elimina completamente o encadeamento interno, que permanece na função auxiliar dadosDoArtesao().

## 6. Validação técnica

Foram realizadas as seguintes verificações:

- npm run build: executado com sucesso após as alterações, confirmando a compilação do backend.
- git diff --check: executado sem apontar problemas de espaços em branco ou formatação no diff.
- npm test: não foi possível executar os testes automatizados porque a variável de ambiente DATABASE_URL_TEST não está configurada.

A falha na execução dos testes ocorreu durante a inicialização das suítes, antes da execução dos casos de teste. Portanto, não representa uma falha de asserção causada pela refatoração.

A execução dos testes permanece pendente até que o banco de dados de teste seja configurado.

## 7. Observação sobre correções adicionais

Durante a revisão do arquivo produto.service.ts, também foram identificados problemas preexistentes de compilação que precisaram ser corrigidos:

- Inclusão da função disponibilidadeDe(), responsável por calcular a disponibilidade do produto com base na quantidade disponível em estoque.
- Ajuste da função situacaoDe() para considerar o estado pausado, permitindo distinguir produtos inativos dos demais estados de estoque.

Essas alterações foram necessárias para corrigir os erros de compilação já existentes no arquivo e permitir a execução do build.

Entretanto, são correções independentes da refatoração do Code Smell Message Chains e, por isso, foram registradas separadamente nesta análise.

## 8. Conclusão

A revisão identificou a ocorrência do Code Smell Message Chains em três métodos do serviço de produtos, caracterizada pela repetição de acessos encadeados às propriedades loja.usuario.id e loja.usuario.nome.

Após avaliar a implementação, foi considerada tecnicamente adequada a aplicação da técnica Extract Method, por meio da criação da função auxiliar dadosDoArtesao().

A alteração reduziu a repetição, centralizou a construção dos dados básicos do artesão e preservou o formato das respostas dos métodos analisados.

O método recomendados() foi mantido porque possui tratamento específico para dados ausentes, evitando alterações desnecessárias em seu comportamento.

As correções adicionais de compilação também foram realizadas e documentadas separadamente.

Conclui-se que a refatoração foi adequada para melhorar a organização e a manutenibilidade do código, sem justificar uma alteração mais ampla na estrutura do serviço.

A compilação foi validada com sucesso. A validação dos testes automatizados permanece pendente da configuração do banco de dados de teste.