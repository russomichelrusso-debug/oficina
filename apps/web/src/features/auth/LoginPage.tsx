import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@oficina/ui";
import { loginSchema } from "@oficina/validation";
import type { LoginResponseDTO } from "@oficina/types";
import { api, ApiError } from "../../services/api";
import { useAuthStore } from "../../store/auth.store";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("admin@oficina.com");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const session = await api.post<LoginResponseDTO>("/auth/login", parsed.data, { skipAuth: true });
      setSession(session);
      navigate("/");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 10,
          width: 340,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>🔧 Oficina — ERP</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Entre com sua conta para continuar
        </p>

        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        {formError && (
          <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{formError}</div>
        )}

        <Button type="submit" style={{ width: "100%" }} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
