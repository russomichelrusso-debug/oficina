import React, { useState } from "react";
import { Button, Input } from "@oficina/ui";
import { createVehicleSchema } from "@oficina/validation";
import type { CustomerDTO, VehicleDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

interface VehicleWithCustomer extends VehicleDTO {
  customer?: { name: string };
}

export function VeiculosPage() {
  const { data: vehicles, loading, error, refetch } = useAsync(
    () => api.get<VehicleWithCustomer[]>("/vehicles"),
    [],
  );
  const { data: customers } = useAsync(() => api.get<CustomerDTO[]>("/customers"), []);

  const [form, setForm] = useState({
    customerId: "",
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = createVehicleSchema.safeParse({
      customerId: form.customerId,
      plate: form.plate,
      brand: form.brand,
      model: form.model,
      year: form.year ? Number(form.year) : undefined,
      color: form.color || undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSaving(true);
    try {
      await api.post("/vehicles", parsed.data);
      setForm({ customerId: "", plate: "", brand: "", model: "", year: "", color: "" });
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao salvar veículo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Veículos</h1>

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
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
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
        <Input
          label="Placa"
          value={form.plate}
          onChange={(e) => setForm({ ...form, plate: e.target.value })}
        />
        <Input
          label="Marca"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
        />
        <Input
          label="Modelo"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />
        <Input
          label="Ano"
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />
        <Input
          label="Cor"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        {formError && (
          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13 }}>{formError}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar veículo"}
          </Button>
        </div>
      </form>

      {loading && <p>Carregando veículos...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {vehicles && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Placa</th>
              <th style={{ padding: 10 }}>Veículo</th>
              <th style={{ padding: 10 }}>Cliente</th>
              <th style={{ padding: 10 }}>KM</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 10 }}>{v.plate}</td>
                <td style={{ padding: 10 }}>
                  {v.brand} {v.model} {v.year ? `(${v.year})` : ""}
                </td>
                <td style={{ padding: 10 }}>{v.customer?.name ?? "—"}</td>
                <td style={{ padding: 10 }}>{v.mileageKm ?? "—"}</td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhum veículo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
