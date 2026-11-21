export const PORT = Number(process.env.PORT ?? 4000);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
export const RECOMENDACAO_API_URL = process.env.RECOMENDACAO_API_URL ?? "";
export const RECOMENDACAO_API_KEY =
  process.env.RECOMENDACAO_API_KEY ?? "origem-mockup-key";
export const RECOMENDACAO_TIMEOUT_MS = Number(
  process.env.RECOMENDACAO_TIMEOUT_MS ?? 2000
);
