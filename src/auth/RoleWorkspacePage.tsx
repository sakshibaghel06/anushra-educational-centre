import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { AppRole } from "../lib/database.types";
import { AuthLoading } from "./AuthStates";
import { useAuth } from "./AuthProvider";

const labels: Record<AppRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Administrator",
};

export function RoleWorkspacePage({ role }: { role: AppRole }) {
  const { error, isLoading, profile, signOut, user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSignOut() {
    setActionError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setActionError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    }
  }

  if (isLoading) return <AuthLoading />;
  if (error || !user) return <div className="auth-state"><p>{error ?? "Your session has ended."}</p></div>;

  return (
    <section className="portal-shell">
      <div className="portal-shell__header container">
        <div>
          <span className="eyebrow">{labels[role]} portal</span>
          <h1>Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.</h1>
          <p>Signed in as {user.email}</p>
        </div>
        <button className="button button--secondary" onClick={handleSignOut} type="button">
          <LogOut aria-hidden="true" size={16} /> Sign out
        </button>
      </div>
      <div className="portal-shell__notice container">
        <ShieldCheck aria-hidden="true" size={24} />
        <div>
          <h2>Secure account access is connected.</h2>
          <p>
            This portal is a foundation only. Courses, classes, learning records, and management tools are not yet implemented.
            No demo records or invented progress are displayed.
          </p>
        </div>
      </div>
      {actionError && <p className="portal-shell__error container" role="alert">{actionError}</p>}
    </section>
  );
}
