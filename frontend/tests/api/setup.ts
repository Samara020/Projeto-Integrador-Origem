// Falha cedo e com instrução clara se o frontend não estiver de pé.
import { BASE_URL } from "./cliente";

beforeAll(async () => {
  try {
    await fetch(`${BASE_URL}/api/categorias`, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new Error(
      `Frontend fora do ar em ${BASE_URL}. Suba antes: cd frontend && npm run build && npm start (ou defina API_BASE_URL).`,
    );
  }
});
