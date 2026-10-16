"use client";

import { useConsulta } from "@/hooks/useConsulta";
import { adminService } from "@/services/admin";

export function useMetricasAdmin() {
  return useConsulta("admin:metricas", (sinal) => adminService.metricas(sinal));
}
