import type { Metadata } from "next";
import { Chat } from "@/components/suporte/Chat";

export const metadata: Metadata = { title: "Ticket" };

export default async function PaginaTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Chat ticketId={id} />;
}
