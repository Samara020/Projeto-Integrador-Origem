import Image, { type ImageProps } from "next/image";

// Foto de peça: a peça cadastrada pelo próprio artesão guarda a imagem como
// data URL (o upload de arquivo só existe com o backend, na Avaliação 2), e o
// otimizador do next/image não entende data URL.
export function Foto({ src, alt, ...resto }: Omit<ImageProps, "unoptimized">) {
  const endereco = typeof src === "string" ? src : ((src as { src?: string }).src ?? "");
  const local = endereco.startsWith("data:") || endereco.startsWith("blob:");

  return <Image src={src} alt={alt} unoptimized={local} {...resto} />;
}
