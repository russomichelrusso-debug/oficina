import React from "react";
import { StatCard } from "@oficina/ui";
import type { DashboardSummaryDTO } from "@oficina/types";
import { api } from "../services/api";
import { useAsync } from "../hooks/useAsync";

export function DashboardPage() {
  const { data, loading, error } = useAsync(
    () => api.get<DashboardSummaryDTO>("/reports/dashboard/summary"),
    [],
  );

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Oficina — Hoje</h1>

      {loading && <p>Carregando indicadores...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {data && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Clientes cadastrados" value={data.totalCustomers} />
          <StatCard label="Veículos cadastrados" value={data.totalVehicles} />
          <StatCard label="Usuários ativos" value={data.activeUsers} />
        </div>
      )}

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        Os indicadores de Ordens de Serviço em andamento e faturamento do dia
        (ver spec §13) aparecem aqui a partir das Fases 2/3/5, quando os
        módulos de OS e Financeiro entram em produção.
      </div>
    </div>
  );
}
