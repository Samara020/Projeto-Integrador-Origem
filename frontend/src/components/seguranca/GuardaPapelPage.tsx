"use client";

import { GuardaPapel } from "@/components/seguranca/GuardaPapel";
import type { Papel } from "@/types";

export function GuardaPapelPage({
  papel,
  children,
}: {
  papel: Papel;
  children: React.ReactNode;
}) {
  return (
    <GuardaPapel papel={papel}>
      {children}
    </GuardaPapel>
  );
}
