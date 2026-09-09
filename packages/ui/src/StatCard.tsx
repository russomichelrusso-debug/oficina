import React from "react";

export interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "16px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  );
}
