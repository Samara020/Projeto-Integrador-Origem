import "dotenv/config";
import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import { tratarErro } from "./middleware/error";
import { idsComoTexto } from "./middleware/ids-texto";
import { montarRotas } from "./routes";
import { PORT, CORS_ORIGIN } from "./config";

export function criarApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(idsComoTexto);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  montarRotas(app);

  app.use(tratarErro);

  return app;
}

const app = criarApp();

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API Origem rodando em http://localhost:${PORT}`);
  });
}

export default app;
