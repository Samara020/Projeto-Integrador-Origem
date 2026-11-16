import "dotenv/config";

// Os testes apagam todas as tabelas. Nunca rodam no banco de desenvolvimento:
// exigem um banco proprio (DATABASE_URL_TEST) criado com database/sql/01, 02 e 04.
const urlTeste = process.env.DATABASE_URL_TEST;
if (!urlTeste) {
  throw new Error(
    "DATABASE_URL_TEST nao definido. Crie um banco de teste (scripts database/sql/01, 02, 04) e informe a URL no .env."
  );
}
if (urlTeste === process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_TEST nao pode ser igual a DATABASE_URL: os testes apagam os dados.");
}
process.env.DATABASE_URL = urlTeste;
process.env.NODE_ENV = "test";
