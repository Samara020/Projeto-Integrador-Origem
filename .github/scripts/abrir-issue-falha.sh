#!/usr/bin/env bash
set -euo pipefail

# Erro passageiro da API do GitHub (rede, limite de requisições) não pode fazer
# a falha passar sem aviso: cada chamada ao gh tem até 3 tentativas.
tentar() {
  local tentativa
  for tentativa in 1 2 3; do
    if "$@"; then
      return 0
    fi
    if [ "$tentativa" -lt 3 ]; then
      echo "Tentativa ${tentativa} de 3 falhou (${1} ${2}). Nova tentativa em $((tentativa * 5))s." >&2
      sleep $((tentativa * 5))
    fi
  done
  echo "As 3 tentativas falharam (${1} ${2})." >&2
  return 1
}

label="falha-pipeline"
titulo="Falha na pipeline: ${WORKFLOW} (${BRANCH})"
quando="$(TZ=America/Recife date '+%d/%m/%Y às %H:%M')"
artefato="${ARTEFATO_URL:-$EXECUCAO_URL}"
falhas="$(node .github/scripts/falhas.mjs relatorios || echo 'Não foi possível ler os resultados dos testes. Veja a execução.')"

{
  echo "- **Workflow:** ${WORKFLOW}"
  echo "- **Evento:** ${EVENTO}"
  echo "- **Branch:** ${BRANCH}"
  echo "- **Commit:** [\`${COMMIT:0:7}\`](${COMMIT_URL})"
  echo "- **Execução:** ${EXECUCAO_URL}"
  echo "- **Artefatos** (XML, logs, prints e vídeos): ${artefato}"
  echo
  echo "$falhas"
} > "$RUNNER_TEMP/detalhes.md"

tentar gh label create "$label" --color B60205 \
  --description "Aberta automaticamente quando a pipeline falha" --force

# Lista as issues abertas sem usar a busca do GitHub, que demora a indexar,
# e compara o título exato.
abertas="$(tentar gh issue list --label "$label" --state open --limit 100 --json number,title)"
existente="$(jq -r --arg titulo "$titulo" '.[] | select(.title == $titulo) | .number' <<< "$abertas" | head -n 1)"

if [ -n "$existente" ]; then
  {
    echo "A pipeline falhou de novo em ${quando}."
    echo
    cat "$RUNNER_TEMP/detalhes.md"
  } > "$RUNNER_TEMP/corpo.md"
  tentar gh issue comment "$existente" --body-file "$RUNNER_TEMP/corpo.md"
  echo "Falha registrada como comentário na issue #${existente}."
else
  {
    echo "A pipeline falhou em ${quando} e esta issue foi aberta automaticamente."
    echo
    cat "$RUNNER_TEMP/detalhes.md"
    echo
    echo "---"
    echo "Próximo passo (docs/testes/issues-e-quality-gate.md): investigar e registrar a correção nesta issue. Enquanto esta issue estiver aberta, cada nova falha do mesmo workflow e branch vira um comentário aqui. Feche quando a pipeline voltar a passar."
  } > "$RUNNER_TEMP/corpo.md"
  tentar gh issue create --title "$titulo" --label "$label" --body-file "$RUNNER_TEMP/corpo.md"
fi
