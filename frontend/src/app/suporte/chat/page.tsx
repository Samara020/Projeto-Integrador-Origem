import type { Metadata } from "next";
import { Chat } from "@/components/suporte/Chat";

export const metadata: Metadata = { title: "Falar com suporte" };

export default function PaginaChatNovo() {
  return <Chat ticketId={null} />;
}
