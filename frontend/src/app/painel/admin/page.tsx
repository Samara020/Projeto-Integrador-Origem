import type { Metadata } from "next";
import { AcessoAdmin } from "@/components/admin/AcessoAdmin";
import DashboardAdmin from "@/components/admin/DashboardAdmin";

export const metadata: Metadata = { title: "Dashboard administrador" };

export default function PaginaDashboardAdmin() {
  return (
    <AcessoAdmin>
      <DashboardAdmin />
    </AcessoAdmin>
  );
}
