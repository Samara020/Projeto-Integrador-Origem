// Falha cedo e com instrução clara se o backend + Postgres não estiverem de pé.
import { BASE_URL } from "./cliente";

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new Error(
      `Backend fora do ar ou sem conexão com o banco em ${BASE_URL} (${detalhe}). Suba o backend e o Postgres antes (ou defina API_BASE_URL / BACKEND_URL).`,
    );
  }
});
