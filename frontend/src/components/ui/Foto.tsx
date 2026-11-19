import Image, { type ImageProps } from "next/image";

// Foto resiliente: aceita data URL, blob, URLs externas (sem exigir whitelist por host)
// e trata string vazia com fundo neutro sem quebrar o next/image.
export function Foto({ src, alt, className, ...resto }: Omit<ImageProps, "unoptimized">) {
  const endereco = typeof src === "string" ? src.trim() : ((src as { src?: string }).src ?? "");
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
  const semOtimizador =
    endereco.startsWith("data:") ||
    endereco.startsWith("blob:") ||
    endereco.startsWith("http://") ||
    endereco.startsWith("https://");

  return <Image src={endereco} alt={alt} unoptimized={semOtimizador} className={className} {...resto} />;
}
