export type NavegacaoPainel = {
  inicio: string;
  rotuloLogo: string;
  rotuloMenu: string;
  tituloDrawer: string;
  avisos: { href: string; rotulo: string };
  links: { href: string; nome: string }[];
};

export const NAVEGACAO_ARTESAO: NavegacaoPainel = {
  inicio: "/painel/artesao",
  rotuloLogo: "Origem, painel do artesão",
  rotuloMenu: "Menu do artesão",
  tituloDrawer: "Ateliê",
  avisos: { href: "/painel/artesao/pedidos", rotulo: "Avisos de pedidos novos" },
  links: [
    { href: "/painel/artesao", nome: "Painel" },
    { href: "/painel/artesao/pecas/nova", nome: "Peças" },
    { href: "/painel/artesao/estoque", nome: "Estoque" },
    { href: "/painel/artesao/pedidos", nome: "Pedidos" },
    { href: "/painel/artesao/envio", nome: "Transporte" },
    { href: "/painel/artesao/perfil", nome: "Perfil" },
  ],
};

export const NAVEGACAO_ADMIN: NavegacaoPainel = {
  inicio: "/painel/admin",
  rotuloLogo: "Origem, painel administrativo",
  rotuloMenu: "Navegação administrativa",
  tituloDrawer: "Administração",
  avisos: { href: "/painel/admin/moderacao", rotulo: "Ver alertas de moderação" },
  links: [
    { href: "/painel/admin", nome: "Painel" },
    { href: "/painel/admin/validacoes", nome: "Validações" },
    { href: "/painel/admin/moderacao", nome: "Moderação" },
    { href: "/painel/admin/perfil", nome: "Perfil" },
  ],
};
