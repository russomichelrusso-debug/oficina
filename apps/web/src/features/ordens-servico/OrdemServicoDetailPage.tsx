import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input } from "@oficina/ui";
import type {
  MechanicDTO,
  PartDTO,
  ServiceDTO,
  ServiceOrderDTO,
  WorkSessionDTO,
} from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAsync } from "../../hooks/useAsync";
import { useAuthStore } from "../../store/auth.store";
import { STATUS_LABELS } from "./OrdensServicoPage";
import { ALLOWED_TRANSITIONS } from "./statusMachine";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  marginBottom: 20,
};
const sectionTitle: React.CSSProperties = { fontSize: 16, fontWeight: 700, marginBottom: 12 };
const money = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function OrdemServicoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const { data: order, loading, error, refetch } = useAsync(
    () => api.get<ServiceOrderDTO>(`/service-orders/${id}`),
    [id],
  );
  const { data: mechanics } = useAsync(() => api.get<MechanicDTO[]>("/mechanics"), []);
  const { data: services } = useAsync(() => api.get<ServiceDTO[]>("/services"), []);
  const { data: parts } = useAsync(() => api.get<PartDTO[]>("/parts"), []);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isPrivileged = hasRole("ADMIN", "GERENTE", "RECEPCAO");
  const isMechanic = hasRole("MECANICO");

  async function run(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      await refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Erro ao processar ação");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Carregando OS...</p>;
  if (error) return <p style={{ color: "#dc2626" }}>{error}</p>;
  if (!order) return null;

  const publicLink = `${window.location.origin}/portal/${order.publicToken}`;
  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];
  const activeWorkSession = order.workSessions?.find((w) => !w.endAt);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>
          OS #{order.number} — {STATUS_LABELS[order.status] ?? order.status}
        </h1>
      </div>

      {actionError && (
        <div style={{ ...card, borderColor: "#fecaca", color: "#dc2626" }}>{actionError}</div>
      )}

      <div style={card}>
        <div style={sectionTitle}>Dados gerais</div>
        <p>
          <strong>Cliente:</strong> {order.customer?.name} ({order.customer?.phone ?? "sem telefone"})
        </p>
        <p>
          <strong>Veículo:</strong> {order.vehicle?.plate} — {order.vehicle?.brand} {order.vehicle?.model}
        </p>
        <p>
          <strong>Reclamação:</strong> {order.complaint ?? "—"}
        </p>
        <p>
          <strong>Mecânico:</strong> {order.mechanic?.user?.name ?? "não atribuído"}
        </p>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Link do cliente:{" "}
          <a href={publicLink} target="_blank" rel="noreferrer">
            {publicLink}
          </a>
        </p>

        {isPrivileged && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <select
              value={order.mechanicId ?? ""}
              onChange={(e) =>
                run(() => api.patch(`/service-orders/${order.id}/mechanic`, { mechanicId: e.target.value }))
              }
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="">Atribuir mecânico...</option>
              {mechanics?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {nextStatuses.map((status) => (
            <Button
              key={status}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run(() => api.patch(`/service-orders/${order.id}/status`, { status }))
              }
            >
              → {STATUS_LABELS[status] ?? status}
            </Button>
          ))}
          {nextStatuses.length === 0 && <span style={{ color: "#9ca3af" }}>OS finalizada.</span>}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Histórico</div>
          {order.statusHistory?.map((h) => (
            <div key={h.id} style={{ fontSize: 13, color: "#4b5563" }}>
              {h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : ""}
              {STATUS_LABELS[h.toStatus] ?? h.toStatus} em {new Date(h.changedAt).toLocaleString("pt-BR")}
              {h.note ? ` — ${h.note}` : ""}
            </div>
          ))}
        </div>
      </div>

      {isMechanic && order.mechanicId && (
        <WorkSessionCard order={order} activeWorkSession={activeWorkSession} onChange={refetch} />
      )}

      <DiagnosticsCard orderId={order.id} diagnostics={order.diagnostics ?? []} onChange={refetch} />

      <QuotesCard
        order={order}
        services={services ?? []}
        parts={parts ?? []}
        onChange={refetch}
      />

      <ChecklistCard orderId={order.id} checklists={order.checklists ?? []} onChange={refetch} />

      <MediaCard order={order} onChange={refetch} />

      {(hasRole("ADMIN", "GERENTE", "FINANCEIRO", "RECEPCAO")) && (
        <FinancialCard order={order} onChange={refetch} />
      )}
    </div>
  );
}

// -------------------------------------------------------------------------

function WorkSessionCard({
  order,
  activeWorkSession,
  onChange,
}: {
  order: ServiceOrderDTO;
  activeWorkSession?: WorkSessionDTO;
  onChange: () => void;
}) {
  const [serviceId, setServiceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      await api.post("/work-sessions/start", { serviceOrderId: order.id, serviceId: serviceId || undefined });
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao iniciar cronômetro");
    } finally {
      setBusy(false);
    }
  }

  async function finish(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/work-sessions/${id}/finish`);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao finalizar cronômetro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Meu cronômetro</div>
      {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
      {activeWorkSession ? (
        <div>
          <p>
            Em andamento desde {new Date(activeWorkSession.startAt).toLocaleTimeString("pt-BR")}
          </p>
          <Button variant="danger" disabled={busy} onClick={() => finish(activeWorkSession.id)}>
            Finalizar atividade
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="">Atividade (opcional)...</option>
            {order.items
              ?.filter((i) => i.type === "SERVICE")
              .map((i) => (
                <option key={i.id} value={i.referenceId}>
                  {i.description}
                </option>
              ))}
          </select>
          <Button disabled={busy} onClick={start}>
            Iniciar
          </Button>
        </div>
      )}

      {(order.workSessions?.length ?? 0) > 0 && (
        <table style={{ width: "100%", marginTop: 12, fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {order.workSessions!.map((w) => (
              <tr key={w.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={{ padding: 6 }}>{w.mechanic?.user?.name ?? "—"}</td>
                <td style={{ padding: 6 }}>{w.service?.name ?? "—"}</td>
                <td style={{ padding: 6 }}>
                  {w.durationSeconds != null
                    ? `${Math.floor(w.durationSeconds / 60)} min`
                    : "em andamento"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function DiagnosticsCard({
  orderId,
  diagnostics,
  onChange,
}: {
  orderId: string;
  diagnostics: NonNullable<ServiceOrderDTO["diagnostics"]>;
  onChange: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState([{ description: "", severity: "MEDIA" }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/diagnostics", {
        serviceOrderId: orderId,
        summary: summary || undefined,
        items: items.filter((i) => i.description.trim()),
      });
      setSummary("");
      setItems([{ description: "", severity: "MEDIA" }]);
      onChange();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Erro ao salvar diagnóstico");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Diagnóstico</div>
      {diagnostics.map((d) => (
        <div key={d.id} style={{ marginBottom: 10, fontSize: 13 }}>
          <strong>{d.summary}</strong>
          <ul>
            {d.items.map((i) => (
              <li key={i.id}>
                {i.description} {i.severity ? `(${i.severity})` : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <form onSubmit={submit}>
        <Input label="Resumo" value={summary} onChange={(e) => setSummary(e.target.value)} />
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Descrição do problema"
              value={item.description}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], description: e.target.value };
                setItems(next);
              }}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
            <select
              value={item.severity}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], severity: e.target.value };
                setItems(next);
              }}
              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setItems([...items, { description: "", severity: "MEDIA" }])}
          >
            + item
          </Button>
          <Button type="submit" disabled={busy}>
            Salvar diagnóstico
          </Button>
        </div>
        {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
      </form>
    </div>
  );
}

function QuotesCard({
  order,
  services,
  parts,
  onChange,
}: {
  order: ServiceOrderDTO;
  services: ServiceDTO[];
  parts: PartDTO[];
  onChange: () => void;
}) {
  type Line = { kind: "SERVICE" | "PART"; refId: string; description: string; unitPrice: number; quantity: number };
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addLine(kind: "SERVICE" | "PART") {
    setLines([...lines, { kind, refId: "", description: "", unitPrice: 0, quantity: 1 }]);
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    const next = [...lines];
    next[idx] = { ...next[idx], ...patch };
    setLines(next);
  }

  function pickReference(idx: number, refId: string) {
    const line = lines[idx];
    if (line.kind === "SERVICE") {
      const s = services.find((x) => x.id === refId);
      updateLine(idx, { refId, description: s?.name ?? "", unitPrice: Number(s?.basePrice ?? 0) });
    } else {
      const p = parts.find((x) => x.id === refId);
      updateLine(idx, { refId, description: p?.name ?? "", unitPrice: Number(p?.unitPrice ?? 0) });
    }
  }

  async function createQuote() {
    setBusy(true);
    setErr(null);
    try {
      await api.post("/quotes", {
        serviceOrderId: order.id,
        items: lines
          .filter((l) => l.refId)
          .map((l) => ({
            type: l.kind,
            referenceId: l.refId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
      });
      setLines([]);
      onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao criar orçamento");
    } finally {
      setBusy(false);
    }
  }

  async function sendQuote(id: string) {
    await api.post(`/quotes/${id}/send`);
    onChange();
  }

  async function approveQuote(quoteId: string, itemIds: string[]) {
    await api.post(`/quotes/${quoteId}/approve`, { approvedItemIds: itemIds });
    onChange();
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Orçamentos</div>

      {order.quotes?.map((q) => (
        <div key={q.id} style={{ border: "1px solid #f3f4f6", borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Total {money(q.total)}</strong>
            <span>{q.status}</span>
          </div>
          <ul style={{ fontSize: 13 }}>
            {q.items.map((i) => (
              <li key={i.id}>
                {i.description} — {i.quantity} × {money(i.unitPrice)} = {money(i.total)}
              </li>
            ))}
          </ul>
          {q.status === "RASCUNHO" && (
            <Button variant="secondary" onClick={() => sendQuote(q.id)}>
              Enviar ao cliente
            </Button>
          )}
          {q.approvals.length === 0 && q.status !== "RASCUNHO" && (
            <Button
              variant="secondary"
              onClick={() => approveQuote(q.id, q.items.map((i) => i.id))}
              style={{ marginLeft: 8 }}
            >
              Registrar aprovação total (telefone)
            </Button>
          )}
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        {lines.map((line, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, width: 60 }}>{line.kind === "SERVICE" ? "Serviço" : "Peça"}</span>
            <select
              value={line.refId}
              onChange={(e) => pickReference(idx, e.target.value)}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            >
              <option value="">Selecione...</option>
              {(line.kind === "SERVICE" ? services : parts).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={line.quantity}
              onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
              style={{ width: 70, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
            <input
              type="number"
              min={0}
              step={0.01}
              value={line.unitPrice}
              onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })}
              style={{ width: 90, padding: "6px 8px", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="button" variant="ghost" onClick={() => addLine("SERVICE")}>
            + serviço
          </Button>
          <Button type="button" variant="ghost" onClick={() => addLine("PART")}>
            + peça
          </Button>
          {lines.length > 0 && (
            <Button disabled={busy} onClick={createQuote}>
              Criar orçamento
            </Button>
          )}
        </div>
        {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
      </div>
    </div>
  );
}

function ChecklistCard({
  orderId,
  checklists,
  onChange,
}: {
  orderId: string;
  checklists: NonNullable<ServiceOrderDTO["checklists"]>;
  onChange: () => void;
}) {
  const DEFAULT_ITEMS = ["Pneus", "Freios", "Óleo", "Luzes", "Fluidos"];
  const [busy, setBusy] = useState(false);

  async function createChecklist() {
    setBusy(true);
    try {
      await api.post("/checklists", {
        serviceOrderId: orderId,
        templateName: "Checklist de entrada",
        items: DEFAULT_ITEMS.map((label) => ({ label, checked: false })),
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(checklistId: string, items: { label: string; checked: boolean }[], idx: number) {
    const next = items.map((it, i) => (i === idx ? { ...it, checked: !it.checked } : it));
    await api.patch(`/checklists/${checklistId}`, { items: next });
    onChange();
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Checklist</div>
      {checklists.map((c) => (
        <div key={c.id} style={{ marginBottom: 12 }}>
          <strong>{c.templateName}</strong>
          {c.items.map((item, idx) => (
            <label key={idx} style={{ display: "block", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={item.checked}
                disabled={!!c.completedAt}
                onChange={() => toggle(c.id, c.items, idx)}
              />{" "}
              {item.label}
            </label>
          ))}
          {!c.completedAt && (
            <Button
              variant="secondary"
              style={{ marginTop: 6 }}
              onClick={async () => {
                await api.post(`/checklists/${c.id}/complete`);
                onChange();
              }}
            >
              Concluir checklist
            </Button>
          )}
        </div>
      ))}
      {checklists.length === 0 && (
        <Button disabled={busy} onClick={createChecklist}>
          Criar checklist de entrada
        </Button>
      )}
    </div>
  );
}

function MediaCard({ order, onChange }: { order: ServiceOrderDTO; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.post("/media", {
        serviceOrderId: order.id,
        type: file.type.startsWith("video") ? "VIDEO" : "PHOTO",
        stage: order.status === "RECEBIDO" ? "ENTRADA" : "EXECUCAO",
        filename: file.name,
        mimeType: file.type,
        dataBase64,
      });
      onChange();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Erro ao enviar mídia");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Fotos e vídeos</div>
      <input type="file" accept="image/*,video/*" onChange={handleFile} disabled={busy} />
      {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {order.media?.map((m) => (
          <div key={m.id} style={{ width: 120 }}>
            {m.type === "PHOTO" ? (
              <img src={m.url ?? `/uploads/${m.storageKey}`} style={{ width: "100%", borderRadius: 6 }} />
            ) : (
              <video src={m.url ?? `/uploads/${m.storageKey}`} controls style={{ width: "100%", borderRadius: 6 }} />
            )}
            <div style={{ fontSize: 11, color: "#6b7280" }}>{m.stage}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialCard({ order, onChange }: { order: ServiceOrderDTO; onChange: () => void }) {
  const [method, setMethod] = useState("PIX");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function registerPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.post("/financial/payments", {
        serviceOrderId: order.id,
        method,
        amount: Number(amount),
      });
      setAmount("");
      onChange();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Erro ao registrar pagamento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={card}>
      <div style={sectionTitle}>Financeiro</div>
      <ul style={{ fontSize: 13, marginBottom: 12 }}>
        {order.items?.map((i) => (
          <li key={i.id}>
            {i.description} — {money(i.total)}
          </li>
        ))}
      </ul>

      <form onSubmit={registerPayment} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db" }}
        >
          <option value="PIX">PIX</option>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="DEBITO">Débito</option>
          <option value="CREDITO">Crédito</option>
          <option value="BOLETO">Boleto</option>
        </select>
        <Input
          label="Valor"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Registrar pagamento
        </Button>
      </form>
      {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
    </div>
  );
}
