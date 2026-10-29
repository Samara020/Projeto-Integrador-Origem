import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Gera .next/standalone: só o necessário para rodar, usado pelo Dockerfile (imagem enxuta).
  output: "standalone",
};

export default nextConfig;
