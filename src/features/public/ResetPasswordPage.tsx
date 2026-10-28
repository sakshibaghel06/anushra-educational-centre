import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import { supabaseConfigError } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const { sendPasswordReset, updatePassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestingReset = searchParams.get("mode") === "request";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!requestingReset && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (requestingReset) {
        await sendPasswordReset(email.trim());
        setMessage("If an account exists for that address, a password reset email has been requested.");
      } else {
        await updatePassword(password);
        setMessage("Your password has been updated.");
      }
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "The password request could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Account security</span>
        <h1>{requestingReset ? "Reset your password." : "Choose a new password."}</h1>
        <p className="auth-card__intro">
          {requestingReset ? "We’ll request a reset link from the configured Supabase project." : "Use the secure link sent to your email to update your password."}
        </p>
        {supabaseConfigError ? (
          <div className="auth-card__setup" role="status"><strong>Password reset is not connected yet.</strong><p>{supabaseConfigError}</p></div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {requestingReset ? (
              <label>Email address<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            ) : (
              <>
                <label>New password<input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
                <label>Confirm new password<input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></label>
              </>
            )}
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            {message && <p className="auth-form__success" role="status">{message}</p>}
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? "Please wait…" : requestingReset ? "Request reset link" : "Update password"}
            </button>
          </form>
        )}
        <Link className="auth-card__back" to="/login">Back to sign in</Link>
      </div>
    </section>
  );
}
