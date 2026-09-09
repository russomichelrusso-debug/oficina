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
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/veiculos" element={<VeiculosPage />} />
          <Route path="/ordens-servico" element={<OrdensServicoPage />} />
          <Route path="/ordens-servico/:id" element={<OrdemServicoDetailPage />} />
          <Route path="/orcamentos" element={<OrcamentosPage />} />
          <Route path="/mecanicos" element={<MecanicosPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
