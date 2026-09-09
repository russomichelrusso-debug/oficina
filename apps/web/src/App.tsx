import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClientesPage } from "./features/clientes/ClientesPage";
import { VeiculosPage } from "./features/veiculos/VeiculosPage";
import { OrdensServicoPage } from "./features/ordens-servico/OrdensServicoPage";
import { OrdemServicoDetailPage } from "./features/ordens-servico/OrdemServicoDetailPage";
import { OrcamentosPage } from "./features/orcamentos/OrcamentosPage";
import { MecanicosPage } from "./features/mecanicos/MecanicosPage";
import { EstoquePage } from "./features/estoque/EstoquePage";
import { FinanceiroPage } from "./features/financeiro/FinanceiroPage";
import { RelatoriosPage } from "./features/relatorios/RelatoriosPage";
import { PortalPage } from "./features/portal/PortalPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/portal/:token" element={<PortalPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "RECEPCAO"]}>
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/veiculos"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "RECEPCAO"]}>
                <VeiculosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordens-servico"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "RECEPCAO", "FINANCEIRO", "ESTOQUE", "MECANICO"]}>
                <OrdensServicoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ordens-servico/:id"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "RECEPCAO", "FINANCEIRO", "ESTOQUE", "MECANICO"]}>
                <OrdemServicoDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orcamentos"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "RECEPCAO", "MECANICO"]}>
                <OrcamentosPage />
              </ProtectedRoute>
            }
          />
          <Route path="/mecanicos" element={<MecanicosPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route
            path="/financeiro"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "FINANCEIRO", "RECEPCAO"]}>
                <FinanceiroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute roles={["ADMIN", "GERENTE", "FINANCEIRO"]}>
                <RelatoriosPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
