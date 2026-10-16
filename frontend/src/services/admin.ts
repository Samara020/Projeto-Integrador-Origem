import { http } from "@/lib/http";
import type { MetricasAdmin } from "@/types";

export const adminService = {
  metricas(sinal?: AbortSignal) {
    return http<MetricasAdmin>("/admin/painel/metricas", { sinal });
  },
};
