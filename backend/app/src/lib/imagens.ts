const MAX_IMAGENS = 6;
const MAX_BYTES_POR_IMAGEM = 1_500_000;
const MAX_BYTES_TOTAL = 8_000_000;
const URL_RELATIVA = /^\/(?!\/)/;
const URL_HTTP = /^https?:\/\/[^\s]+$/i;
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i;

const bytesDaImagem = (valor: string): number => {
  const base64 = valor.match(/^data:image\/[^;]+;base64,(.*)$/i)?.[1];
  if (base64) return Math.floor((base64.replace(/\s/g, "").length * 3) / 4);
  return Buffer.byteLength(valor, "utf8");
};

/** Valida quantidade, formato e tamanho das fotos recebidas no JSON. */
export function validarImagens(imagens: unknown): string | null {
  if (!Array.isArray(imagens)) return "Envie a lista de imagens.";
  if (imagens.length > MAX_IMAGENS) return `Envie no máximo ${MAX_IMAGENS} imagens.`;

  let total = 0;
  for (const imagem of imagens) {
    if (typeof imagem !== "string" || !imagem.trim()) {
      return "Cada imagem deve ser uma URL ou um data URI válido.";
    }
    if (!URL_HTTP.test(imagem) && !URL_RELATIVA.test(imagem) && !DATA_IMAGE.test(imagem)) {
      return "Use imagens http(s), caminho relativo ou data:image.";
    }
    const bytes = bytesDaImagem(imagem);
    if (bytes > MAX_BYTES_POR_IMAGEM) return "Cada imagem deve ter no máximo 1,5 MB.";
    total += bytes;
  }

  if (total > MAX_BYTES_TOTAL) return "As imagens somam mais de 8 MB.";
  return null;
}

export const LIMITES_IMAGEM = {
  maxImagens: MAX_IMAGENS,
  maxBytesPorImagem: MAX_BYTES_POR_IMAGEM,
  maxBytesTotal: MAX_BYTES_TOTAL,
};
