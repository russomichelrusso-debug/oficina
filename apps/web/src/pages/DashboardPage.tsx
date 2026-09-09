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
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Clientes cadastrados" value={data.totalCustomers} />
          <StatCard label="Veículos cadastrados" value={data.totalVehicles} />
          <StatCard label="Usuários ativos" value={data.activeUsers} />
          <StatCard label="OS em andamento" value={data.openServiceOrders} />
          <StatCard
            label="Faturado hoje"
            value={data.revenueToday.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
        </div>
      )}
    </div>
  );
}
