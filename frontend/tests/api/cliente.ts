// Cliente HTTP dos testes de API. Fala com o frontend de pé, não importa código da rota.
export const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type Resposta<T = unknown> = {
  status: number;
  corpo: T;
  cabecalhos: Headers;
  ms: number;
};

async function chamar<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown): Promise<Resposta<T>> {
  const inicio = performance.now();
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: metodo,
    headers: corpo === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  const ms = performance.now() - inicio;

  let dados: unknown = texto;
  try {
    dados = JSON.parse(texto);
  } catch {
    // Corpo que não é JSON fica como texto, para o teste mostrar o que veio.
  }
  return { status: resposta.status, corpo: dados as T, cabecalhos: resposta.headers, ms };
}

export const get = <T = unknown>(caminho: string) => chamar<T>("GET", caminho);
export const post = <T = unknown>(caminho: string, corpo?: unknown) => chamar<T>("POST", caminho, corpo);

// Formato único de erro da Fake API (frontend/AGENTS.md, regra 7).
export const erro = (mensagem: string) => ({ mensagem });
