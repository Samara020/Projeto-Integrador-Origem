// Diagnóstico de instabilidade da TAS (docs/tas.md): compara várias rodadas da mesma suíte,
// no mesmo commit, e classifica cada teste.
//   estável          passou em todas as rodadas em que rodou
//   falha constante  falhou em todas: é defeito do sistema ou do teste, não instabilidade
//   intermitente     passou em umas e falhou em outras sem mudança de código
// Falha seguida de sucesso continua contada como falha: o diagnóstico não esconde nada.
// Uma falha só não confirma instabilidade; com menos de 3 rodadas o resultado é indício.
// Uso: node scripts/instabilidade.mjs <pasta>
//   <pasta> tem uma subpasta por rodada, cada uma com os JUnit XML daquela execução (o
//   workflow diagnostico-instabilidade.yml baixa os artefatos nesse formato).
// Gera relatorios/instabilidade.json e imprime o resumo em Markdown. Só informa: sai com 0.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lerCasos } from "./metricas.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Classifica cada teste a partir das rodadas. Cada rodada é a lista de casos de lerCasos.
 * Caso ignorado numa rodada não conta como tentativa.
 */
export function classificar(rodadas) {
  const porTeste = new Map();
  rodadas.forEach((casos, indice) => {
    for (const caso of casos) {
      if (caso.estado === "ignorado") continue;
      const chave = `${caso.arquivo} :: ${caso.nome}`;
      const dado = porTeste.get(chave) ?? { nome: caso.nome, arquivo: caso.arquivo, tentativas: [] };
      dado.tentativas.push({ rodada: indice + 1, estado: caso.estado, segundos: caso.segundos, erro: caso.erro ?? null });
      porTeste.set(chave, dado);
    }
  });
  return [...porTeste.values()].map(({ nome, arquivo, tentativas }) => {
    const falhas = tentativas.filter((tentativa) => tentativa.estado === "falhou");
    const segundos = tentativas.map((tentativa) => tentativa.segundos);
    return {
      nome,
      arquivo,
      tentativas: tentativas.length,
      falhas: falhas.length,
      rodadasComFalha: falhas.map((tentativa) => tentativa.rodada),
      erros: [...new Set(falhas.map((tentativa) => tentativa.erro).filter(Boolean))],
      segundosEmMedia: Number((segundos.reduce((soma, valor) => soma + valor, 0) / segundos.length).toFixed(2)),
      segundosNoMaximo: Math.max(...segundos),
      classe: !falhas.length ? "estável" : falhas.length === tentativas.length ? "falha constante" : "intermitente",
    };
  });
}

export function resumo(testes, rodadas) {
  const conta = (classe) => testes.filter((teste) => teste.classe === classe).length;
  const linha = (teste) => `| ${teste.nome.replaceAll("|", "\\|")} | ${teste.falhas} de ${teste.tentativas} | ${teste.rodadasComFalha.join(", ")} | ${(teste.erros[0] ?? "").replaceAll("|", "\\|").slice(0, 120)} |`;
  const tabela = (classe) => {
    const itens = testes.filter((teste) => teste.classe === classe);
    return itens.length ? ["| Teste | Falhas | Rodadas com falha | Primeiro erro |", "| --- | ---: | --- | --- |", ...itens.map(linha)] : ["Nenhum."];
  };
  return [
    `### Diagnóstico de instabilidade: ${rodadas} rodada(s)`,
    "",
    `Testes observados: ${testes.length}. Estáveis: ${conta("estável")}. Intermitentes: ${conta("intermitente")}. Falha constante: ${conta("falha constante")}.`,
    rodadas < 3 ? "Com menos de 3 rodadas o resultado é só indício: uma falha isolada não confirma instabilidade." : "",
    "",
    "#### Intermitentes (candidatos a quarentena, com issue pelo formulário de manutenção)",
    "",
    ...tabela("intermitente"),
    "",
    "#### Falha constante (defeito do sistema ou do teste, não vai para a quarentena)",
    "",
    ...tabela("falha constante"),
    "",
  ].join("\n");
}

function xmlsDe(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return xmlsDe(caminho);
    // A quarentena já roda com novas tentativas: fica fora do diagnóstico.
    return nome.endsWith(".xml") && !nome.startsWith("quarentena-") ? [caminho] : [];
  });
}

function main() {
  const pasta = process.argv[2];
  if (!pasta || !existsSync(pasta)) {
    console.error("Uso: node scripts/instabilidade.mjs <pasta com uma subpasta por rodada>");
    process.exit(1);
  }
  const rodadas = readdirSync(pasta)
    .map((nome) => join(pasta, nome))
    .filter((caminho) => statSync(caminho).isDirectory())
    .sort()
    .map((caminho) => xmlsDe(caminho).flatMap((xml) => lerCasos(readFileSync(xml, "utf8"))));
  const testes = classificar(rodadas);
  const texto = resumo(testes, rodadas.length);

  mkdirSync(join(RAIZ, "relatorios"), { recursive: true });
  writeFileSync(join(RAIZ, "relatorios", "instabilidade.json"), `${JSON.stringify({ rodadas: rodadas.length, testes }, null, 2)}\n`);
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
