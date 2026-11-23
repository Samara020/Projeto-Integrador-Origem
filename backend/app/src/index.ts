// A Vercel já injeta as variáveis de ambiente; dotenv é necessário só localmente.
if (process.env.VERCEL !== "1") {
  require("dotenv/config");
}
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { rotaNaoEncontrada, tratarErro } from "./middleware/error";
import { idsComoTexto } from "./middleware/ids-texto";
import { montarRotas } from "./routes";
import { PORT, CORS_ORIGIN } from "./config";
import { prepararBanco } from "./lib/setup-db";
import prisma from "./lib/prisma";

export function criarApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
      exposedHeaders: ["X-Recomendacao-Fonte", "Retry-After"],
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(idsComoTexto);

  // No deploy Vercel, o rewrite público encaminha /api/* para este serviço.
  // Mantemos as rotas sem prefixo para Docker e desenvolvimento local.
  const rotasApi = express.Router();
  montarRotas(rotasApi);
  app.use("/api", rotasApi);

  const checarSaude = async (_req: express.Request, res: express.Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "indisponivel" });
    }
  };

  app.get("/health", checarSaude);
  rotasApi.get("/health", checarSaude);

  montarRotas(app);

  app.use(rotaNaoEncontrada);
  app.use(tratarErro);

  return app;
}

const app = criarApp();

// Permite subir uma API de homologação isolada em modo test sem executar
// setup/migrations automaticamente. O endpoint /__test/identity também fica
// restrito a NODE_ENV=test e só informa o banco conectado.
const servidorDescartavelDeTeste =
  process.env.NODE_ENV === "test" && process.env.ORIGEM_TEST_SERVER === "1";

if (process.env.VERCEL !== "1" && (process.env.NODE_ENV !== "test" || servidorDescartavelDeTeste)) {
  const bancoPronto = servidorDescartavelDeTeste ? Promise.resolve() : prepararBanco();
  bancoPronto
    .then(() => {
      if (servidorDescartavelDeTeste) {
        app.listen(PORT, "127.0.0.1", () => {
          console.log(`API descartável de teste rodando em http://127.0.0.1:${PORT}`);
        });
      } else {
        app.listen(PORT, () => {
          console.log(`API Origem rodando em http://localhost:${PORT}`);
        });
      }
    })
    .catch((erro) => {
      console.error("Falha ao preparar o banco:", erro);
      process.exit(1);
    });
}

export default app;
