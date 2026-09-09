import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@oficina/ui";
import type { CustomerDTO, ServiceOrderDTO, VehicleDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Diagnóstico",
  ORCAMENTO: "Orçamento",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  EM_EXECUCAO: "Em execução",
  AGUARDANDO_PECA: "Aguardando peça",
  CONTROLE_QUALIDADE: "Controle de qualidade",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  ENCERRADO: "Encerrado",
};

export function OrdensServicoPage() {
  const navigate = useNavigate();
  const { data: orders, loading, error, refetch } = useAsync(
    () => api.get<ServiceOrderDTO[]>("/service-orders"),
    [],
  );
  const { data: customers } = useAsync(() => api.get<CustomerDTO[]>("/customers"), []);
  const { data: vehicles } = useAsync(() => api.get<VehicleDTO[]>("/vehicles"), []);

  const [form, setForm] = useState({ customerId: "", vehicleId: "", complaint: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const vehiclesOfCustomer = vehicles?.filter((v) => v.customerId === form.customerId) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.customerId || !form.vehicleId) {
      setFormError("Selecione cliente e veículo");
      return;
    }
    setSaving(true);
    try {
      const order = await api.post<ServiceOrderDTO>("/service-orders", {
        customerId: form.customerId,
        vehicleId: form.vehicleId,
        complaint: form.complaint || undefined,
      });
      setForm({ customerId: "", vehicleId: "", complaint: "" });
      refetch();
      navigate(`/ordens-servico/${order.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao criar OS");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Ordens de Serviço</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Cliente</label>
          <select
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value, vehicleId: "" })}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            <option value="">Selecione...</option>
            {customers?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Veículo</label>
          <select
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            disabled={!form.customerId}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            <option value="">Selecione...</option>
            {vehiclesOfCustomer.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Reclamação do cliente"
          value={form.complaint}
          onChange={(e) => setForm({ ...form, complaint: e.target.value })}
        />
        {formError && (
          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13 }}>{formError}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Criando..." : "Abrir nova OS"}
          </Button>
        </div>
      </form>

      {loading && <p>Carregando ordens de serviço...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {orders && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Nº</th>
              <th style={{ padding: 10 }}>Cliente</th>
              <th style={{ padding: 10 }}>Veículo</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Mecânico</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                onClick={() => navigate(`/ordens-servico/${o.id}`)}
                style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
              >
                <td style={{ padding: 10 }}>#{o.number}</td>
                <td style={{ padding: 10 }}>{o.customer?.name ?? "—"}</td>
                <td style={{ padding: 10 }}>
                  {o.vehicle ? `${o.vehicle.plate} — ${o.vehicle.brand} ${o.vehicle.model}` : "—"}
                </td>
                <td style={{ padding: 10 }}>
                  <span
                    style={{
                      background: "#eef2ff",
                      color: "#3730a3",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td style={{ padding: 10 }}>{o.mechanic?.user?.name ?? "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma ordem de serviço ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export { STATUS_LABELS };
