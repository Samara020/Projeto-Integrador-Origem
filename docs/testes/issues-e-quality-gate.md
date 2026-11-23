# Issues automáticas e bloqueio de merge

## Abertura automática de issues

Falhas na regressão ou no build/smoke dos containers da main geram uma issue com label `falha-pipeline`. A execução agendada também gera issue se falhar. Falhas de pull requests ficam nos checks do PR, sem abrir issues automáticas.

O registro identifica workflow, branch, SHA e execução. Quando há JUnit, lista os casos reprovados e aponta os artefatos. Falha antes dos testes é informada mesmo sem artefato. Outra falha do mesmo workflow/branch comenta na issue aberta existente. A emissão é serializada para evitar criações concorrentes. Não há fechamento automático de defeitos nem relaxamento dos testes.

## Check de aprovação do PR

O workflow executa regressão completa e build/smoke dos containers em PRs para main. O check `Quality Gate` sempre avalia os dois jobs e só aprova quando ambos terminam com `success`. Falha, cancelamento ou job pulado reprovam o gate.

A existência do check, sozinha, não impede merge. É necessário ativar a regra de proteção abaixo nas configurações do GitHub.

## Ativação da regra por administrador

A configuração preparada em `.github/quality-gate.ruleset.json` exige:

- PR para integrar na main;
- check `Quality Gate` do GitHub Actions aprovado e atualizado com a base;
- zero revisões humanas obrigatórias (não altera a equipe responsável pela aprovação);
- nenhum bypass configurado;
- proteção contra exclusão e force push da main.

A mudança substitui o acordo anterior de push direto na main para as alterações futuras, conforme o pedido de bloqueio de merge.

Primeiro publique os workflows e aguarde uma execução verde com o check `Quality Gate`. Depois, uma pessoa com permissão administrativa no repositório executa, a partir da raiz:

```sh
gh api --method POST repos/Samara020/Projeto-Integrador-Origem/rulesets \
  --input .github/quality-gate.ruleset.json
```

Ou configure em Settings > Rules > Rulesets: a branch main, pull request obrigatório e check `Quality Gate`.

Confirme o resultado:

```sh
gh api repos/Samara020/Projeto-Integrador-Origem/rulesets \
  --jq '.[] | {id, name, enforcement}'
# Substitua ID pelo identificador da regra criada:
gh api repos/Samara020/Projeto-Integrador-Origem/rulesets/ID
```

A regra deve estar em `active`, apontar para `refs/heads/main` e exigir o contexto `Quality Gate`. Se já existe uma regra com esse nome, revise-a e use PUT no endpoint `/rulesets/ID`, em vez de criar uma duplicata.

## Limite de acesso identificado

Na preparação desta alteração, a conta conectada `devkappiushon` tinha `push=true`, `admin=false` e `maintain=false`. A tentativa de criar a regra foi recusada pelo GitHub com HTTP 404. Portanto, a publicação do JSON não significa proteção ativa. A proprietária ou outra pessoa com permissão Administration/write precisa aplicar a configuração. Não é necessário fornecer credenciais a terceiros.

Referências: [API de rulesets](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset) e [checks dependentes](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
