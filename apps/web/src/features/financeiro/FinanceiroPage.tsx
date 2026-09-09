import React, { useState } from "react";
import { Button } from "@oficina/ui";
import type { AccountReceivableDTO } from "@oficina/types";
import { api } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ClosingReport {
  date: string;
  total: number;
  byMethod: Record<string, number>;
  count: number;
}

export function FinanceiroPage() {
  const { data: receivables, loading, error } = useAsync(
    () => api.get<AccountReceivableDTO[]>("/financial/accounts-receivable"),
    [],
  );

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [closing, setClosing] = useState<ClosingReport | null>(null);
  const [loadingClosing, setLoadingClosing] = useState(false);

  async function loadClosing() {
    setLoadingClosing(true);
    try {
      const result = await api.get<ClosingReport>(`/financial/closing?date=${date}`);
      setClosing(result);
    } finally {
      setLoadingClosing(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Financeiro</h1>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Fechamento diário</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
          <Button onClick={loadClosing} disabled={loadingClosing}>
            Consultar
          </Button>
        </div>
        {closing && (
          <div>
            <p>
              <strong>Total recebido:</strong> {money(closing.total)} ({closing.count} pagamentos)
            </p>
            <ul>
              {Object.entries(closing.byMethod).map(([method, amount]) => (
                <li key={method}>
                  {method}: {money(amount)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: 12 }}>Contas a receber</h2>
      {loading && <p>Carregando...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {receivables && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Cliente</th>
              <th style={{ padding: 10 }}>Vencimento</th>
              <th style={{ padding: 10 }}>Valor</th>
              <th style={{ padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 10 }}>{r.customer?.name ?? "—"}</td>
                <td style={{ padding: 10 }}>{new Date(r.dueDate).toLocaleDateString("pt-BR")}</td>
                <td style={{ padding: 10 }}>{money(r.amount)}</td>
                <td
                  style={{
                    padding: 10,
                    color: r.status === "ATRASADO" ? "#dc2626" : r.status === "PAGO" ? "#16a34a" : undefined,
                    fontWeight: 600,
                  }}
                >
                  {r.status}
                </td>
              </tr>
            ))}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma conta a receber no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
