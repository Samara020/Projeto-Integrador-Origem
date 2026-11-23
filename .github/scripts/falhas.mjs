// Lista em Markdown os testes que falharam, lendo os JUnit XML de uma pasta.
// Uso: node .github/scripts/falhas.mjs [pasta]   (padrão: relatorios)
// A saída é a seção "Testes que falharam" do corpo da issue falha-pipeline.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const LIMITE_FALHAS = 20;
const LIMITE_MENSAGEM = 200;

function texto(atributo) {
  return (atributo ?? "")
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Uma linha só, sem crase (quebraria o Markdown) e com tamanho limitado. */
function limpar(valor) {
  const linha = (valor ?? "").trim().split("\n")[0].replace(/`/g, "'") || "sem mensagem";
  return linha.length > LIMITE_MENSAGEM ? `${linha.slice(0, LIMITE_MENSAGEM - 3)}...` : linha;
}

/** Casos de teste de um JUnit XML: { total, falhas: [{ nome, arquivo, mensagem }] }. */
export function lerJUnit(xml) {
  const falhas = [];
  let total = 0;
  for (const [, atributos, corpo] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    total += 1;
    const falha = corpo?.match(/<(?:failure|error)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:failure|error)>)/);
    if (!falha) continue;
    const atributo = (nome, origem = atributos) => texto(origem.match(new RegExp(`\\b${nome}="([^"]*)"`))?.[1]);
    // O Cypress põe a mensagem no atributo message; o jest-junit e o pytest, no corpo da tag.
    const corpoDaFalha = texto((falha[2] ?? "").replace(/^<!\[CDATA\[|\]\]>$/g, ""));
    falhas.push({
      nome: limpar(atributo("name")),
      arquivo: atributo("file") || atributo("classname"),
      mensagem: limpar(atributo("message", falha[1]) || corpoDaFalha),
    });
  }
  return { total, falhas };
}

/** Seção em Markdown com as falhas de todos os XML da pasta. */
export function resumir(pasta) {
  const arquivos = existsSync(pasta) ? readdirSync(pasta).filter((nome) => nome.endsWith(".xml")).sort() : [];
  if (!arquivos.length) {
    return [
      "### Testes que falharam",
      "",
      "Nenhum resultado de teste foi gerado: a falha aconteceu antes dos testes (instalação de dependências, build ou subida dos serviços). Veja os logs da execução.",
    ].join("\n");
  }

  let total = 0;
  const falhas = [];
  for (const arquivo of arquivos) {
    const lido = lerJUnit(readFileSync(join(pasta, arquivo), "utf8"));
    total += lido.total;
    for (const falha of lido.falhas) falhas.push({ suite: arquivo.replace(/\.xml$/, ""), ...falha });
  }

  const linhas = [`### Testes que falharam (${falhas.length} de ${total})`, ""];
  if (!falhas.length) {
    linhas.push("Nenhum teste falhou nos resultados: a falha foi em outro passo do job. Veja a execução para saber qual.");
    return linhas.join("\n");
  }
  for (const { suite, nome, arquivo, mensagem } of falhas.slice(0, LIMITE_FALHAS)) {
    linhas.push(`- **${suite}** · \`${nome}\`${arquivo ? ` (\`${arquivo}\`)` : ""}: ${mensagem}`);
  }
  if (falhas.length > LIMITE_FALHAS) {
    linhas.push("", `E mais ${falhas.length - LIMITE_FALHAS} falhas. A lista completa está nos XML do artefato relatorios-testes.`);
  }
  return linhas.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(resumir(process.argv[2] ?? "relatorios"));
}
