import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { accessToken, hasRole } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acesso restrito</h2>
        <p>Seu perfil não tem permissão para ver esta página.</p>
      </div>
    );
  }

  return <>{children}</>;
}
