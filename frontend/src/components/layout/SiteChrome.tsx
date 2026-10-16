"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

// O painel tem navegação própria: o header e o rodapé do site não entram nele.
function dentroDoPainel(pathname: string) {
  return (
    pathname === "/painel/admin" ||
    pathname === "/painel/artesao" ||
    pathname.startsWith("/painel/artesao/")
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  if (dentroDoPainel(pathname)) return null;
  return <Header />;
}

export function SiteFooter() {
  const pathname = usePathname();
  if (dentroDoPainel(pathname)) return null;
  return <Footer />;
}
