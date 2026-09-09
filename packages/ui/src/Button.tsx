import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: "#1d4ed8", color: "#fff", border: "1px solid #1d4ed8" },
  secondary: { background: "#fff", color: "#1d4ed8", border: "1px solid #1d4ed8" },
  danger: { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" },
  ghost: { background: "transparent", color: "#1f2937", border: "1px solid transparent" },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", style, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
