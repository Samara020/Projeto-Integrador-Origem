import { readFileSync } from "fs";
import path from "path";
import prisma from "./prisma";

/**
 * Prepara o banco ao subir a API, quando AUTO_SETUP_DB=true:
 *  - sem tabelas: aplica database/sql/01, 02 e 04;
 *  - sem usuarios: aplica o seed database/sql/05.
 * Banco ja populado nao e alterado.
 */

const DIR_SQL = process.env.SQL_DIR ?? path.resolve(process.cwd(), "../../database/sql");

/** Divide um script SQL em comandos, respeitando strings, comentarios e $$...$$. */
export function dividirComandos(sql: string): string[] {
  const comandos: string[] = [];
  let atual = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const dois = sql.slice(i, i + 2);
    if (dois === "--") {
      const fim = sql.indexOf("\n", i);
      i = fim === -1 ? sql.length : fim;
    } else if (c === "'") {
      let j = i + 1;
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1;
      atual += sql.slice(i, j + 1);
      i = j + 1;
    } else if (c === "$" && sql[i + 1] === "$") {
      const fim = sql.indexOf("$$", i + 2);
      atual += sql.slice(i, fim + 2);
      i = fim + 2;
    } else if (c === ";") {
      if (atual.trim()) comandos.push(atual.trim());
      atual = "";
      i++;
    } else {
      atual += c;
      i++;
    }
  }
  if (atual.trim()) comandos.push(atual.trim());
  return comandos.filter((cmd) => !/^(BEGIN|COMMIT)$/i.test(cmd));
}

async function executarArquivo(nome: string) {
  const sql = readFileSync(path.join(DIR_SQL, nome), "utf8").replace(/^\uFEFF/, "");
  const comandos = dividirComandos(sql);
  await prisma.$transaction(
    async (tx) => {
      for (const cmd of comandos) await tx.$executeRawUnsafe(cmd);
    },
    { timeout: 60000 }
  );
  console.log(`[setup-db] aplicado ${nome}`);
}

export async function prepararBanco() {
  if (process.env.AUTO_SETUP_DB !== "true") return;

  const [{ existe }] = await prisma.$queryRawUnsafe<{ existe: boolean }[]>(
    "SELECT to_regclass('public.usuario') IS NOT NULL AS existe"
  );

  if (!existe) {
    for (const arquivo of ["01_create_tables.sql", "02_integrity_rules.sql", "04_create_indexes.sql"]) {
      await executarArquivo(arquivo);
    }
  }

  if ((await prisma.usuario.count()) === 0) {
    await executarArquivo("05_seed_dados_reais.sql");
  } else {
    console.log("[setup-db] banco ja possui dados; nada a fazer.");
  }
}
