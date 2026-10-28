import { Link } from "react-router";
import { supabaseConfigError } from "../lib/supabase";

export function AuthLoading() {
  return (
    <div aria-live="polite" className="auth-state">
      <span aria-hidden="true" className="auth-spinner" />
      <p>Checking your account…</p>
    </div>
  );
}

export function AuthSetupNotice({ error }: { error?: string | null }) {
  return (
    <section className="auth-state auth-state--notice">
      <span className="eyebrow">Account access</span>
      <h1>Portal access needs setup.</h1>
      <p>{error ?? supabaseConfigError ?? "Your account permissions could not be loaded."}</p>
      <p className="auth-state__note">
        No sample account or demo sign-in is provided. Contact the school administrator for an invited account.
      </p>
      <Link className="button button--primary" to="/login">Go to sign in</Link>
      <Link className="button button--secondary" to="/">Return to the public website</Link>
    </section>
  );
}
