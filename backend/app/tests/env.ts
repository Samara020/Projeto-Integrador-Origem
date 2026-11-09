import "dotenv/config";
import { urlBancoTeste } from "./banco-teste";

// Os testes apagam todas as tabelas. Nunca rodam no banco de desenvolvimento:
// exigem um banco proprio (DATABASE_URL_TEST) criado com database/sql/01, 02 e 04.
process.env.DATABASE_URL = urlBancoTeste();
process.env.NODE_ENV = "test";
process.env.JWT_SECRET ??= "segredo-exclusivo-dos-testes-locais";
