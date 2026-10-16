import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "@/components/ui/toaster";
import { SiteFooter, SiteHeader } from "@/components/layout/SiteChrome";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const descricao =
  "Artesanato, literatura e arte de Pernambuco, comprados direto de quem faz. Conheça a técnica, a região e a história de cada peça.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Origem · artesanato de Pernambuco direto de quem faz",
    template: "%s · Origem",
  },
  description: descricao,
  authors: [{ name: "Equipe Origem · CESAR School" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Origem",
    title: "Origem · artesanato de Pernambuco direto de quem faz",
    description: descricao,
    images: [
      {
        url: "/produtos/vaso-ceramica.jpg",
        width: 1584,
        height: 672,
        alt: "Vaso de cerâmica pintado à mão sobre mesa de madeira em um ateliê",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${lora.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <Provider>
          <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-raio focus:bg-superficie focus:px-4 focus:py-2 focus:text-apoio focus:font-semibold focus:text-terracota"
          >
            Pular para o conteúdo
          </a>
          <SiteHeader />
          <main id="conteudo" className="flex flex-1 flex-col">
            {children}
          </main>
          <SiteFooter />
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}
