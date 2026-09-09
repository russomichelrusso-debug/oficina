import React from "react";
import { api } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

interface ProductivityRow {
  mechanicId: string;
  name: string;
  totalSeconds: number;
  sessions: number;
}

interface AverageTimeRow {
  serviceId: string;
  name: string;
  estimatedMinutes: number | null;
  averageMinutes: number;
  count: number;
}

interface ForecastRow {
  serviceOrderId: string;
  number: number;
  customer: string;
  vehicle: string | null;
  status: string;
  remainingMinutes: number;
  forecastAt: string;
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  marginBottom: 20,
};

export function RelatoriosPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: productivity } = useAsync(
    () => api.get<ProductivityRow[]>(`/reports/productivity?from=${monthAgo}&to=${today}`),
    [],
  );
  const { data: averageTime } = useAsync(() => api.get<AverageTimeRow[]>("/reports/average-time"), []);
  const { data: forecast } = useAsync(() => api.get<ForecastRow[]>("/reports/delivery-forecast"), []);

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Relatórios</h1>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Produtividade por mecânico (últimos 30 dias)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Mecânico</th>
              <th style={{ padding: 8 }}>Sessões</th>
              <th style={{ padding: 8 }}>Tempo total</th>
            </tr>
          </thead>
          <tbody>
            {productivity?.map((p) => (
              <tr key={p.mechanicId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.sessions}</td>
                <td style={{ padding: 8 }}>{Math.round(p.totalSeconds / 60)} min</td>
              </tr>
            ))}
            {(productivity?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>
                  Sem dados no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Tempo médio por serviço</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>Serviço</th>
              <th style={{ padding: 8 }}>Estimado</th>
              <th style={{ padding: 8 }}>Real (média)</th>
              <th style={{ padding: 8 }}>Amostras</th>
            </tr>
          </thead>
          <tbody>
            {averageTime?.map((a) => (
              <tr key={a.serviceId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>{a.name}</td>
                <td style={{ padding: 8 }}>{a.estimatedMinutes ?? "—"} min</td>
                <td style={{ padding: 8 }}>{a.averageMinutes} min</td>
                <td style={{ padding: 8 }}>{a.count}</td>
              </tr>
            ))}
            {(averageTime?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>
                  Sem dados suficientes ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Previsão de entrega (OS ativas)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 8 }}>OS</th>
              <th style={{ padding: 8 }}>Cliente</th>
              <th style={{ padding: 8 }}>Veículo</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Previsão</th>
            </tr>
          </thead>
          <tbody>
            {forecast?.map((f) => (
              <tr key={f.serviceOrderId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>#{f.number}</td>
                <td style={{ padding: 8 }}>{f.customer}</td>
                <td style={{ padding: 8 }}>{f.vehicle ?? "—"}</td>
                <td style={{ padding: 8 }}>{f.status}</td>
                <td style={{ padding: 8 }}>{new Date(f.forecastAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {(forecast?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 12, textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma OS em execução no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
