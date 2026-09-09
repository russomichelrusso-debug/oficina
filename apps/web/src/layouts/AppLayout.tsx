import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@oficina/ui";
import { useAuthStore } from "../store/auth.store";

// `roles` ausente = visível para qualquer usuário logado (o backend ainda
// aplica o RBAC de verdade nos endpoints — isto só evita levar o usuário a
// uma tela que vai só devolver 403).
const NAV_ITEMS: { to: string; label: string; end?: boolean; roles?: string[] }[] = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/clientes", label: "Clientes", roles: ["ADMIN", "GERENTE", "RECEPCAO"] },
  { to: "/veiculos", label: "Veículos", roles: ["ADMIN", "GERENTE", "RECEPCAO"] },
  {
    to: "/ordens-servico",
    label: "Ordens de Serviço",
    roles: ["ADMIN", "GERENTE", "RECEPCAO", "FINANCEIRO", "ESTOQUE", "MECANICO"],
  },
  { to: "/orcamentos", label: "Orçamentos", roles: ["ADMIN", "GERENTE", "RECEPCAO", "MECANICO"] },
  { to: "/mecanicos", label: "Mecânicos" },
  { to: "/estoque", label: "Estoque" },
  { to: "/financeiro", label: "Financeiro", roles: ["ADMIN", "GERENTE", "FINANCEIRO", "RECEPCAO"] },
  { to: "/relatorios", label: "Relatórios", roles: ["ADMIN", "GERENTE", "FINANCEIRO"] },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside
        style={{
          width: 220,
          background: "#111827",
          color: "#fff",
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 24, padding: "0 8px" }}>
          🔧 Oficina
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: "8px 12px",
                borderRadius: 6,
                color: "#fff",
                textDecoration: "none",
                fontSize: 14,
                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 14, color: "#374151" }}>
            {user?.name} <span style={{ color: "#9ca3af" }}>({user?.roles.join(", ")})</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sair
          </Button>
        </header>
        <main style={{ flex: 1, padding: 24, background: "#f9fafb" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
