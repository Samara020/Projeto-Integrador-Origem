import { Anvil, BookOpen, Palette, Tag, type LucideIcon } from "lucide-react";

// Ícone por id de categoria. Categoria nova sem ícone cai no Tag.
const ICONES: Record<string, LucideIcon> = {
  artesanato: Anvil,
  literatura: BookOpen,
  "arte-e-decoracao": Palette,
};

export function iconeCategoria(id: string): LucideIcon {
  return ICONES[id] ?? Tag;
}
