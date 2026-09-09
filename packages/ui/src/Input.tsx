import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, style, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...rest}
        style={{
          padding: "8px 10px",
          borderRadius: 6,
          border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`,
          fontSize: 14,
          ...style,
        }}
      />
      {error && <span style={{ fontSize: 12, color: "#dc2626" }}>{error}</span>}
    </div>
  );
}
