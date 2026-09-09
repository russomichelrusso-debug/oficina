import React, { useState } from "react";
import { Button, Input } from "@oficina/ui";
import { createCustomerSchema } from "@oficina/validation";
import type { CustomerDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

export function ClientesPage() {
  const { data: customers, loading, error, refetch } = useAsync(
    () => api.get<CustomerDTO[]>("/customers"),
    [],
  );

  const [form, setForm] = useState({ name: "", document: "", phone: "", email: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = createCustomerSchema.safeParse({
      name: form.name,
      document: form.document || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSaving(true);
    try {
      await api.post("/customers", parsed.data);
      setForm({ name: "", document: "", phone: "", email: "" });
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Clientes</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        <Input
          label="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Documento (CPF/CNPJ)"
          value={form.document}
          onChange={(e) => setForm({ ...form, document: e.target.value })}
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        {formError && (
          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13 }}>{formError}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Adicionar cliente"}
          </Button>
        </div>
      </form>

      {loading && <p>Carregando clientes...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {customers && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Nome</th>
              <th style={{ padding: 10 }}>Documento</th>
              <th style={{ padding: 10 }}>Telefone</th>
              <th style={{ padding: 10 }}>E-mail</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 10 }}>{c.name}</td>
                <td style={{ padding: 10 }}>{c.document ?? "—"}</td>
                <td style={{ padding: 10 }}>{c.phone ?? "—"}</td>
                <td style={{ padding: 10 }}>{c.email ?? "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
