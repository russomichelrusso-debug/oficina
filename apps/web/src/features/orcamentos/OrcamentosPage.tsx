import React from "react";
import { useNavigate } from "react-router-dom";
import type { QuoteDTO } from "@oficina/types";
import { api } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

interface QuoteWithOrder extends QuoteDTO {
  serviceOrder?: { number: number; id: string };
}

const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrcamentosPage() {
  const navigate = useNavigate();
  const { data: quotes, loading, error } = useAsync(() => api.get<QuoteWithOrder[]>("/quotes"), []);

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Orçamentos</h1>

      {loading && <p>Carregando orçamentos...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {quotes && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>OS</th>
              <th style={{ padding: 10 }}>Itens</th>
              <th style={{ padding: 10 }}>Total</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr
                key={q.id}
                onClick={() => navigate(`/ordens-servico/${q.serviceOrderId}`)}
                style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
              >
                <td style={{ padding: 10 }}>#{q.serviceOrder?.number ?? "—"}</td>
                <td style={{ padding: 10 }}>{q.items.length}</td>
                <td style={{ padding: 10 }}>{money(q.total)}</td>
                <td style={{ padding: 10 }}>{q.status}</td>
                <td style={{ padding: 10 }}>{new Date(q.createdAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhum orçamento criado ainda. Crie um a partir de uma Ordem de Serviço.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
