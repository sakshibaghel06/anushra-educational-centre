import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import { supabaseConfigError } from "../../lib/supabase";

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/portal";
  if (value === "/portal" || /^\/(student|teacher|admin)\/[a-z-]+$/.test(value)) return value;
  return "/portal";
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(safeRedirect(searchParams.get("redirect")), { replace: true });
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Anushra learning community</span>
        <h1>Welcome back.</h1>
        <p className="auth-card__intro">Sign in with an account provided by the school.</p>
        {supabaseConfigError ? (
          <div className="auth-card__setup" role="status">
            <strong>Sign-in is not connected yet.</strong>
            <p>{supabaseConfigError}</p>
            <p>Account registration is invitation-only. No demo credentials are available.</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input autoComplete="username" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label>
              Password
              <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
        {!supabaseConfigError && <Link className="auth-card__link" to="/reset-password?mode=request">Forgot your password?</Link>}
        <Link className="auth-card__back" to="/">Back to the public website</Link>
      </div>
    </section>
  );
}
