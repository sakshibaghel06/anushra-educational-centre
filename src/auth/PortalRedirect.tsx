import { Navigate, useLocation } from "react-router";
import { AuthLoading, AuthSetupNotice } from "./AuthStates";
import { useAuth } from "./AuthProvider";

const portalByRole = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
} as const;

export function PortalRedirect() {
  const { error, isLoading, roles, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoading />;
  if (!user && !error) {
    return <Navigate replace to={`/login?redirect=${encodeURIComponent(location.pathname)}`} />;
  }
  if (error || !user || roles.length === 0) return <AuthSetupNotice error={error} />;
  const role = (["admin", "teacher", "student"] as const).find((item) => roles.includes(item));
  return role ? <Navigate replace to={portalByRole[role]} /> : <AuthSetupNotice />;
}
