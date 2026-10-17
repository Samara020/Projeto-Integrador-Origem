import type { Metadata } from "next";
import DashboardAdmin from "@/components/admin/DashboardAdmin";

export const metadata: Metadata = { title: "Dashboard administrador" };

export default function PaginaDashboardAdmin() {
  return <DashboardAdmin />;
}
