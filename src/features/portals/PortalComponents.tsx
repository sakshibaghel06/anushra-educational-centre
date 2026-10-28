import { AlertCircle, CheckCircle2, Inbox, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { errorMessage } from "./portalUtils";

export function PortalPage({
  role,
  title,
  description,
  children,
}: {
  role: "Student" | "Teacher" | "Administrator";
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(errorMessage(error));
    }
  }

  return (
    <section className="portal-shell">
      <header className="portal-shell__header container">
        <div>
          <span className="eyebrow">{role} portal</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="portal-shell__actions">
          <Link className="button button--secondary" to="/portal">Portal home</Link>
          <button className="button button--secondary" onClick={() => void handleSignOut()} type="button">Sign out</button>
        </div>
      </header>
      {signOutError && <p className="portal-shell__error container" role="alert">{signOutError}</p>}
      <div className="container portal-content">{children}</div>
    </section>
  );
}

export function PortalLoading({ label = "Loading school records…" }: { label?: string }) {
  return (
    <div aria-live="polite" className="portal-state">
      <LoaderCircle aria-hidden="true" className="portal-spin" size={25} />
      <p>{label}</p>
    </div>
  );
}

export function PortalError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="portal-message portal-message--error" role="alert">
      <AlertCircle aria-hidden="true" size={19} />
      <p>{message}</p>
      {retry && <button className="button button--secondary" onClick={retry} type="button">Try again</button>}
    </div>
  );
}

export function PortalEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="portal-empty">
      <Inbox aria-hidden="true" size={24} strokeWidth={1.7} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function PortalNotice({ children }: { children: ReactNode }) {
  return <div className="portal-message portal-message--notice">{children}</div>;
}

export function PortalSuccess({ children }: { children: ReactNode }) {
  return (
    <div className="portal-message portal-message--success" role="status">
      <CheckCircle2 aria-hidden="true" size={18} />
      <p>{children}</p>
    </div>
  );
}

export function PortalTabs({
  items,
  selected,
  onSelect,
}: {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}) {
  return (
    <div aria-label="Portal sections" className="portal-tabs" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={selected === item}
          className={selected === item ? "portal-tabs__item is-active" : "portal-tabs__item"}
          key={item}
          onClick={() => onSelect(item)}
          role="tab"
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function PortalCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="portal-card">
      <div className="portal-card__heading">
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "No date set";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
