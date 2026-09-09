import React, { useState } from "react";
import { Button, Input } from "@oficina/ui";
import type { MechanicDTO, UserDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

export function MecanicosPage() {
  const { data: mechanics, loading, error, refetch } = useAsync(
    () => api.get<MechanicDTO[]>("/mechanics"),
    [],
  );
  const { data: users } = useAsync(() => api.get<UserDTO[]>("/users").catch(() => [] as UserDTO[]), []);

  const [userId, setUserId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableUsers = (users ?? []).filter(
    (u) => (u.roles as string[]).includes("MECANICO") && !mechanics?.some((m) => m.userId === u.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!userId) {
      setFormError("Selecione um usuário com papel MECANICO");
      return;
    }
    setSaving(true);
    try {
      await api.post("/mechanics", { userId, specialty: specialty || undefined });
      setUserId("");
      setSpecialty("");
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Erro ao cadastrar mecânico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Mecânicos</h1>

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
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Usuário (papel MECANICO)
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
          >
            <option value="">Selecione...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>
            Crie o usuário com o papel MECANICO na tela de Usuários (Admin) antes de cadastrá-lo aqui.
          </span>
        </div>
        <Input label="Especialidade" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        {formError && (
          <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13 }}>{formError}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar mecânico"}
          </Button>
        </div>
      </form>

      {loading && <p>Carregando mecânicos...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {mechanics && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>Nome</th>
              <th style={{ padding: 10 }}>E-mail</th>
              <th style={{ padding: 10 }}>Especialidade</th>
              <th style={{ padding: 10 }}>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {mechanics.map((m) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 10 }}>{m.user?.name}</td>
                <td style={{ padding: 10 }}>{m.user?.email}</td>
                <td style={{ padding: 10 }}>{m.specialty ?? "—"}</td>
                <td style={{ padding: 10 }}>{m.active ? "Sim" : "Não"}</td>
              </tr>
            ))}
            {mechanics.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhum mecânico cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
