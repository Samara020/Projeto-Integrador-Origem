// Predicado de rede compartilhado pelo guard do Cypress.
// Mantido em módulo separado para poder ser testado sem subir o Cypress.

const IMAGEM_PUBLICA_HOST = "ugtsnoayiambwjcibtsk.supabase.co";
const IMAGEM_PUBLICA_PREFIXO = "/storage/v1/object/public/origem-assets/";
const EXTENSOES_IMAGEM = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

/**
 * Permite somente leitura de imagem do catálogo público no bucket esperado.
 * A exceção é estreita de propósito:
 * - apenas GET;
 * - apenas resourceType "image" (não libera fetch/XHR para o mesmo host);
 * - apenas HTTPS, host exato e prefixo exato do bucket público;
 * - apenas caminhos com extensão de imagem.
 */
function ehImagemPublicaDeCatalogo(req) {
  if (!req || String(req.method || "").toUpperCase() !== "GET") return false;
  if (String(req.resourceType || "").toLowerCase() !== "image") return false;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.hostname !== IMAGEM_PUBLICA_HOST) return false;
  if (!url.pathname.startsWith(IMAGEM_PUBLICA_PREFIXO)) return false;
  if (!EXTENSOES_IMAGEM.test(url.pathname)) return false;

  return true;
}

module.exports = {
  ehImagemPublicaDeCatalogo,
  IMAGEM_PUBLICA_HOST,
  IMAGEM_PUBLICA_PREFIXO,
};
