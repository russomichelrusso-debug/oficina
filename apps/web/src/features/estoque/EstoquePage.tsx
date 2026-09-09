import React, { useState } from "react";
import { Button, Input } from "@oficina/ui";
import type { PartDTO, SupplierDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";

const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function EstoquePage() {
  const { data: parts, loading, error, refetch } = useAsync(() => api.get<PartDTO[]>("/parts"), []);
  const { data: suppliers, refetch: refetchSuppliers } = useAsync(
    () => api.get<SupplierDTO[]>("/suppliers"),
    [],
  );

  const [partForm, setPartForm] = useState({ sku: "", name: "", unitPrice: "", minStock: "0" });
  const [partError, setPartError] = useState<string | null>(null);
  const [savingPart, setSavingPart] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [movement, setMovement] = useState({ partId: "", type: "ENTRADA", quantity: "1" });
  const [movementError, setMovementError] = useState<string | null>(null);
  const [savingMovement, setSavingMovement] = useState(false);

  async function handleCreatePart(e: React.FormEvent) {
    e.preventDefault();
    setPartError(null);
    setSavingPart(true);
    try {
      await api.post("/parts", {
        sku: partForm.sku,
        name: partForm.name,
        unitPrice: Number(partForm.unitPrice),
        minStock: Number(partForm.minStock || 0),
      });
      setPartForm({ sku: "", name: "", unitPrice: "", minStock: "0" });
      refetch();
    } catch (err) {
      setPartError(err instanceof ApiError ? err.message : "Erro ao cadastrar peça");
    } finally {
      setSavingPart(false);
    }
  }

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      await api.post("/suppliers", { name: supplierName });
      setSupplierName("");
      refetchSuppliers();
    } finally {
      setSavingSupplier(false);
    }
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    setMovementError(null);
    if (!movement.partId) {
      setMovementError("Selecione a peça");
      return;
    }
    setSavingMovement(true);
    try {
      await api.post("/stock-movements", {
        partId: movement.partId,
        type: movement.type,
        quantity: Number(movement.quantity),
      });
      setMovement({ ...movement, quantity: "1" });
      refetch();
    } catch (err) {
      setMovementError(err instanceof ApiError ? err.message : "Erro ao registrar movimentação");
    } finally {
      setSavingMovement(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>Estoque</h1>

      <form
        onSubmit={handleCreatePart}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <Input label="SKU" value={partForm.sku} onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })} />
        <Input label="Nome" value={partForm.name} onChange={(e) => setPartForm({ ...partForm, name: e.target.value })} />
        <Input
          label="Preço unitário"
          type="number"
          step="0.01"
          value={partForm.unitPrice}
          onChange={(e) => setPartForm({ ...partForm, unitPrice: e.target.value })}
        />
        <Input
          label="Estoque mínimo"
          type="number"
          value={partForm.minStock}
          onChange={(e) => setPartForm({ ...partForm, minStock: e.target.value })}
        />
        {partError && <div style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13 }}>{partError}</div>}
        <div style={{ gridColumn: "1 / -1" }}>
          <Button type="submit" disabled={savingPart}>
            {savingPart ? "Salvando..." : "Cadastrar peça"}
          </Button>
        </div>
      </form>

      <form
        onSubmit={handleMovement}
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Peça</label>
          <select
            value={movement.partId}
            onChange={(e) => setMovement({ ...movement, partId: e.target.value })}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="">Selecione...</option>
            {parts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name} (saldo {p.currentStock})
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Tipo</label>
          <select
            value={movement.type}
            onChange={(e) => setMovement({ ...movement, type: e.target.value })}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="DEVOLUCAO">Devolução</option>
            <option value="AJUSTE">Ajuste</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </select>
        </div>
        <Input
          label="Quantidade"
          type="number"
          value={movement.quantity}
          onChange={(e) => setMovement({ ...movement, quantity: e.target.value })}
        />
        <Button type="submit" disabled={savingMovement}>
          Registrar movimentação
        </Button>
        {movementError && <span style={{ color: "#dc2626", fontSize: 13 }}>{movementError}</span>}
      </form>

      {loading && <p>Carregando estoque...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {parts && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", marginBottom: 24 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 10 }}>SKU</th>
              <th style={{ padding: 10 }}>Nome</th>
              <th style={{ padding: 10 }}>Preço</th>
              <th style={{ padding: 10 }}>Saldo</th>
              <th style={{ padding: 10 }}>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 10 }}>{p.sku}</td>
                <td style={{ padding: 10 }}>{p.name}</td>
                <td style={{ padding: 10 }}>{money(p.unitPrice)}</td>
                <td
                  style={{
                    padding: 10,
                    color: p.currentStock < p.minStock ? "#dc2626" : undefined,
                    fontWeight: p.currentStock < p.minStock ? 700 : undefined,
                  }}
                >
                  {p.currentStock}
                </td>
                <td style={{ padding: 10 }}>{p.minStock}</td>
              </tr>
            ))}
            {parts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
                  Nenhuma peça cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <h2 style={{ marginBottom: 12 }}>Fornecedores</h2>
      <form onSubmit={handleCreateSupplier} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Nome do fornecedor"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        />
        <Button type="submit" disabled={savingSupplier}>
          Adicionar
        </Button>
      </form>
      <ul>
        {suppliers?.map((s) => <li key={s.id}>{s.name}</li>)}
      </ul>
    </div>
  );
}
