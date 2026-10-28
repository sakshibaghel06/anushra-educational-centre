import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { AuthLoading, AuthSetupNotice } from "./AuthStates";
import { useAuth } from "./AuthProvider";
import type { AppRole } from "../lib/database.types";

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: AppRole[];
  children: ReactNode;
}) {
  const { error, isLoading, roles, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoading />;
  if (!user && !error) {
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(location.pathname)}`} />;
  }
  if (error || !user) return <AuthSetupNotice error={error} />;
  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    return <AuthSetupNotice error="This account does not have permission to access this area." />;
  }

  return children;
}
