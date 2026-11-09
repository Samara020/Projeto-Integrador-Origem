import "dotenv/config";
import { spawnSync } from "node:child_process";
import { urlBancoTeste } from "./banco-teste";

// O banco deve existir. Aplica somente as migrações versionadas; não apaga nem semeia dados.
const url = urlBancoTeste();
const resultado = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
if (resultado.error) throw resultado.error;
process.exit(resultado.status ?? 1);
