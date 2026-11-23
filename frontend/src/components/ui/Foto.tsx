import Image, { type ImageProps } from "next/image";
import { resolverImagemProduto } from "@/lib/imagem-storage";

// Foto resiliente: aceita data URL, blob, URLs externas (sem exigir whitelist por host)
// e trata string vazia com fundo neutro sem quebrar o next/image.
export function Foto({ src, alt, className, ...resto }: Omit<ImageProps, "unoptimized">) {
  const enderecoOriginal = typeof src === "string" ? src.trim() : ((src as { src?: string }).src ?? "");
  const endereco = enderecoOriginal === "https://storage.sistemaorigem.com/placeholder.jpg"
    ? "/produtos/vaso-ceramica.jpg"
    : enderecoOriginal;
  if (!endereco) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`block bg-superficie-2 ${className ?? ""}`}
      />
    );
  }
  const enderecoResolvido = resolverImagemProduto(endereco);
  const semOtimizador =
    enderecoResolvido.startsWith("data:") ||
    enderecoResolvido.startsWith("blob:") ||
    enderecoResolvido.startsWith("http://") ||
    enderecoResolvido.startsWith("https://") ||
    enderecoResolvido.startsWith("/");

  return <Image src={enderecoResolvido} alt={alt} unoptimized={semOtimizador} className={className} {...resto} />;
}
