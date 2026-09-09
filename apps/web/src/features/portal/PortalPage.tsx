import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@oficina/ui";
import type { ServiceOrderDTO } from "@oficina/types";
import { useAsync } from "../../hooks/useAsync";
import { ApiError } from "../../services/api";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Em diagnóstico",
  ORCAMENTO: "Orçamento em preparação",
  AGUARDANDO_APROVACAO: "Aguardando sua aprovação",
  APROVADO: "Aprovado — aguardando execução",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_PECA: "Aguardando peça",
  CONTROLE_QUALIDADE: "Em controle de qualidade",
  PRONTO: "Pronto para retirada",
  ENTREGUE: "Entregue",
  ENCERRADO: "Encerrado",
};

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new ApiError("Não foi possível carregar os dados", res.status);
  return res.json();
}

async function publicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message ?? "Erro ao processar solicitação", res.status);
  }
  return res.json();
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const { data: order, loading, error, refetch } = useAsync(
    () => publicGet<ServiceOrderDTO>(`/public/service-orders/${token}`),
    [token],
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function respond(quoteId: string, itemIds: string[]) {
    setBusy(true);
    setActionError(null);
    try {
      await publicPost(`/public/service-orders/${token}/quotes/${quoteId}/approve`, {
        approvedItemIds: itemIds,
      });
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erro ao registrar sua resposta");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PortalShell>Carregando...</PortalShell>;
  if (error || !order) return <PortalShell>Link inválido ou expirado.</PortalShell>;

  const pendingQuote = order.quotes?.find((q) => q.approvals.length === 0 && q.status !== "RASCUNHO");

  return (
    <PortalShell>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>OS #{order.number}</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        {order.vehicle?.brand} {order.vehicle?.model} — {order.vehicle?.plate}
      </p>

      <div
        style={{
          background: "#eef2ff",
          color: "#3730a3",
          borderRadius: 999,
          padding: "6px 14px",
          fontSize: 14,
          fontWeight: 600,
          display: "inline-block",
          marginBottom: 20,
        }}
      >
        {STATUS_LABELS[order.status] ?? order.status}
      </div>

      {pendingQuote && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Orçamento para aprovação</h2>
          {pendingQuote.items.map((item) => (
            <label key={item.id} style={{ display: "block", marginBottom: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selected[item.id] ?? true}
                onChange={(e) => setSelected({ ...selected, [item.id]: e.target.checked })}
              />{" "}
              {item.description} — {Number(item.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </label>
          ))}
          <p style={{ fontWeight: 700, marginTop: 10 }}>
            Total: {Number(pendingQuote.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button
              disabled={busy}
              onClick={() =>
                respond(
                  pendingQuote.id,
                  pendingQuote.items.filter((i) => selected[i.id] ?? true).map((i) => i.id),
                )
              }
            >
              Aprovar selecionados
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => respond(pendingQuote.id, [])}>
              Recusar orçamento
            </Button>
          </div>
          {actionError && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>{actionError}</p>}
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Acompanhamento</h2>
        {order.statusHistory?.map((h) => (
          <div key={h.id} style={{ fontSize: 13, color: "#4b5563", marginBottom: 4 }}>
            {STATUS_LABELS[h.toStatus] ?? h.toStatus} — {new Date(h.changedAt).toLocaleString("pt-BR")}
          </div>
        ))}
      </div>
    </PortalShell>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>{children}</div>
    </div>
  );
}
