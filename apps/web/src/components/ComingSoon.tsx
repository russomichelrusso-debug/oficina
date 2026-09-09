import React from "react";

interface ComingSoonProps {
  title: string;
  phase: string;
}

export function ComingSoon({ title, phase }: ComingSoonProps) {
  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>{title}</h1>
      <div
        style={{
          background: "#fff",
          border: "1px dashed #d1d5db",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Módulo planejado para a <strong>{phase}</strong> do roadmap (ver
        docs/spec-erp-oficina.md). A estrutura de pastas já está pronta em{" "}
        <code>src/features</code> para receber esta implementação.
      </div>
    </div>
  );
}
