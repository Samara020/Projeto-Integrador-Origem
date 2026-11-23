const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://ugtsnoayiambwjcibtsk.supabase.co";

const PREFIXO_BUCKET = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/origem-assets`;

/** Converte caminhos de imagens legados para o bucket público do Supabase. */
export function resolverImagemProduto(src: string): string {
  const caminho = src.trim();
  const prefixosLegados = ["/produtos/", "/marca/"];
  const prefixo = prefixosLegados.find((item) => caminho.startsWith(item));
  if (!prefixo) return caminho;

  const nome = caminho.slice(prefixo.length);
  return `${PREFIXO_BUCKET}/${nome.split("/").map(encodeURIComponent).join("/")}`;
}
