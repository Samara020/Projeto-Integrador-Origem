// Dados da Fake API. Só src/app/api importa daqui.
// Contas de demonstração. A senha é pública e só existe na Fake API.
import type { Usuario } from "@/types";

export const SENHA_DEMO = "origem123";

// Código que a equipe entrega a quem vai administrar. Sem ele, ninguém se cadastra como ADMINISTRADOR.
export const CODIGO_CONVITE_ADMIN = "ORIGEM-ADMIN-2026";

export const usuarios: Usuario[] = [
  {
    id: "usr_101",
    nome: "Joana Compradora",
    email: "comprador@origem.dev",
    papel: "COMPRADOR",
    criadoEm: "2026-09-03T21:00:00Z",
  },
  {
    id: "usr_901",
    nome: "Ana Pereira",
    email: "artesao@origem.dev",
    papel: "ARTESAO",
    criadoEm: "2026-08-12T10:30:00Z",
  },
  {
    id: "usr_001",
    nome: "Equipe Origem",
    email: "admin@origem.dev",
    papel: "ADMINISTRADOR",
    criadoEm: "2026-08-01T08:00:00Z",
  },
];
