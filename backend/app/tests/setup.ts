import { readFileSync } from "fs";
import path from "path";
import prisma from "../src/lib/prisma";
import { dividirComandos } from "../src/lib/setup-db";

// Os testes exigem banco próprio (DATABASE_URL_TEST) criado com 01, 02 e 04.
// As migrações idempotentes são aplicadas aqui para que a suíte funcione também
// em bancos de teste antigos, sem apagar dados de desenvolvimento.
beforeAll(async () => {
  const dirSql = path.resolve(__dirname, "../../../database/sql");
  for (const arquivo of ["07_suporte_exclusao_logica_produto.sql", "08_integracao_persistencia.sql"]) {
    const sql = readFileSync(path.join(dirSql, arquivo), "utf8").replace(/^\uFEFF/, "");
    for (const comando of dividirComandos(sql)) {
      await prisma.$executeRawUnsafe(comando);
    }
  }
}, 60000);

afterAll(async () => {
  await prisma.$disconnect();
});
