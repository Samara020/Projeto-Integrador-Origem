const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://ugtsnoayiambwjcibtsk.supabase.co";

const PREFIXO_BUCKET = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/origem-assets`;

/** Converte imagens de produto legadas para o bucket público do Supabase. */
export function resolverImagemProduto(src: string): string {
  const caminho = src.trim();
  if (!caminho.startsWith("/produtos/")) return caminho;

  const nome = caminho.slice("/produtos/".length);
  return `${PREFIXO_BUCKET}/${nome.split("/").map(encodeURIComponent).join("/")}`;
}
