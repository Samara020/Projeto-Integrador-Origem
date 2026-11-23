// Cliente HTTP e fixtures dinâmicas dos testes de API contra o backend real + Postgres.
export const BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

export const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE ?? "origem-admin-2026";

export type Resposta<T = unknown> = {
  status: number;
  corpo: T;
  cabecalhos: Headers;
  ms: number;
};

type Opcoes = {
  token?: string;
  headers?: Record<string, string>;
};

async function chamar<T>(
  metodo: "GET" | "POST" | "PUT" | "DELETE",
  caminho: string,
  corpo?: unknown,
  opcoes: Opcoes = {},
): Promise<Resposta<T>> {
  const inicio = performance.now();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opcoes.headers ?? {}),
  };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (opcoes.token) headers.Authorization = `Bearer ${opcoes.token}`;

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: metodo,
    headers,
    body:
      corpo === undefined
        ? undefined
        : typeof corpo === "string"
          ? corpo
          : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  const ms = performance.now() - inicio;

  let dados: unknown = texto;
  try {
    dados = JSON.parse(texto);
  } catch {
    // Corpo não JSON preservado para diagnóstico.
  }
  return { status: resposta.status, corpo: dados as T, cabecalhos: resposta.headers, ms };
}

export const get = <T = unknown>(caminho: string, opcoes?: Opcoes) =>
  chamar<T>("GET", caminho, undefined, opcoes);
export const post = <T = unknown>(caminho: string, corpo?: unknown, opcoes?: Opcoes) =>
  chamar<T>("POST", caminho, corpo, opcoes);
export const put = <T = unknown>(caminho: string, corpo?: unknown, opcoes?: Opcoes) =>
  chamar<T>("PUT", caminho, corpo, opcoes);
export const del = <T = unknown>(caminho: string, opcoes?: Opcoes) =>
  chamar<T>("DELETE", caminho, undefined, opcoes);

export const erro = (mensagem: string) => ({ mensagem });

export type SessaoApi = {
  token: string;
  tipo: string;
  usuario: { id: string; nome: string; papel: "COMPRADOR" | "ARTESAO" | "ADMINISTRADOR" };
};

let seq = 0;
export function emailUnico(prefixo: string): string {
  seq += 1;
  return `${prefixo}.${Date.now()}.${seq}.${Math.floor(Math.random() * 10000)}@origem-teste.dev`;
}

export async function registrarELogar(
  papel: "COMPRADOR" | "ARTESAO" | "ADMINISTRADOR",
  extra: Record<string, unknown> = {},
): Promise<SessaoApi & { email: string; senha: string }> {
  const email = emailUnico(papel.toLowerCase());
  const senha = "SenhaTeste123";
  const payload: Record<string, unknown> = {
    nome: `${papel} Teste ${seq}`,
    email,
    senha,
    papel,
    ...extra,
  };
  if (papel === "ADMINISTRADOR" && !payload.codigoConvite) {
    payload.codigoConvite = ADMIN_INVITE_CODE;
  }

  const reg = await post<SessaoApi & { mensagem?: string }>("/auth/register", payload);
  if (reg.status !== 201) {
    throw new Error(
      `Falha ao registrar ${papel} de teste (${reg.status}): ${JSON.stringify(reg.corpo)}`,
    );
  }

  const login = await post<SessaoApi>("/auth/login", { email, senha });
  if (login.status !== 200 || !login.corpo?.token) {
    throw new Error(
      `Falha ao autenticar ${papel} de teste (${login.status}): ${JSON.stringify(login.corpo)}`,
    );
  }
  return { ...login.corpo, email, senha };
}

export async function criarProdutoAprovado(
  artesaoToken: string,
  adminToken: string,
  overrides: Record<string, unknown> = {},
): Promise<{
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  tecnica: string;
  origem: string;
}> {
  const sufixo = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nome = String(overrides.nome ?? `Peça Integração ${sufixo}`);
  const preco = Number(overrides.preco ?? 120);
  const categoria = String(overrides.categoria ?? "Cerâmica");
  const tecnica = String(overrides.tecnica ?? "Cerâmica manual");
  const origem = String(overrides.origem ?? "Caruaru, PE");

  const criado = await post<{ id: string }>("/produtos", {
    nome,
    descricao: "Peça artesanal criada automaticamente na suíte de integração.",
    categoria,
    tecnica,
    origem,
    preco,
    modalidadeProducao: "PRONTA_ENTREGA",
    estoque: 5,
    imagens: ["/produtos/vaso-ceramica.jpg"],
    ...overrides,
  }, { token: artesaoToken });

  if (criado.status !== 201 || !criado.corpo?.id) {
    throw new Error(`Falha ao criar produto (${criado.status}): ${JSON.stringify(criado.corpo)}`);
  }

  const validado = await put(
    `/produtos/admin/produtos/${encodeURIComponent(criado.corpo.id)}/validacao`,
    { status: "APROVADA", justificativa: "Aprovado automaticamente para teste de integração." },
    { token: adminToken },
  );
  if (validado.status !== 200) {
    throw new Error(`Falha ao aprovar produto (${validado.status}): ${JSON.stringify(validado.corpo)}`);
  }

  return { id: String(criado.corpo.id), nome, preco, categoria, tecnica, origem };
}
