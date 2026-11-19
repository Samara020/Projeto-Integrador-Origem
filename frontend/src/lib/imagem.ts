// Validação e compactação de imagens no navegador antes do envio em JSON.

export const LIMITE_BYTES_IMAGEM = 1_450_000;
export const LIMITE_BYTES_TOTAL_IMAGENS = 4 * 1024 * 1024;
const LIMITE_DIRETO_BYTES = 350 * 1024;
const MAX_DIMENSAO_PX = 1280;

export function bytesDeDataUrl(url: string): number {
  if (!url.startsWith("data:")) return 0;
  const indice = url.indexOf(",");
  if (indice === -1) return 0;
  const base64 = url.slice(indice + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function bytesTotaisImagens(imagens: string[]): number {
  return imagens.reduce((total, imagem) => total + bytesDeDataUrl(imagem), 0);
}

function lerArquivoComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result ?? ""));
    leitor.onerror = () => rejeitar(new Error("Não foi possível ler a imagem selecionada."));
    leitor.readAsDataURL(arquivo);
  });
}

function redimensionarDataUrl(dataUrl: string, qualidade: number): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const imagem = new window.Image();
    imagem.onload = () => {
      const maior = Math.max(imagem.width, imagem.height, 1);
      const escala = maior > MAX_DIMENSAO_PX ? MAX_DIMENSAO_PX / maior : 1;
      const largura = Math.max(1, Math.round(imagem.width * escala));
      const altura = Math.max(1, Math.round(imagem.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d");
      if (!contexto) {
        rejeitar(new Error("Canvas indisponível"));
        return;
      }
      contexto.drawImage(imagem, 0, 0, largura, altura);
      resolver(canvas.toDataURL("image/jpeg", qualidade));
    };
    imagem.onerror = () => rejeitar(new Error("Falha ao processar a imagem."));
    imagem.src = dataUrl;
  });
}

export async function lerImagemCompactada(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione apenas arquivos de imagem (JPG, PNG ou WebP).");
  }

  const original = await lerArquivoComoDataUrl(arquivo);
  const tamanhoOriginal = bytesDeDataUrl(original);
  if (tamanhoOriginal > 0 && tamanhoOriginal <= LIMITE_DIRETO_BYTES) {
    return original;
  }

  try {
    let compactada = await redimensionarDataUrl(original, 0.82);
    if (bytesDeDataUrl(compactada) > LIMITE_BYTES_IMAGEM) {
      compactada = await redimensionarDataUrl(original, 0.62);
    }
    if (bytesDeDataUrl(compactada) <= LIMITE_BYTES_IMAGEM) {
      return compactada;
    }
  } catch {
    if (tamanhoOriginal <= LIMITE_BYTES_IMAGEM) {
      return original;
    }
  }

  throw new Error("A foto ultrapassa 1,5 MB mesmo após compactação. Envie uma versão menor.");
}
