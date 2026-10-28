import { RouterButton } from "../../components/Button";

export default function NotFoundPage() {
  return (
    <section className="not-found">
      <div className="container">
        <span className="eyebrow">A small detour</span>
        <h1>This page is still finding its way.</h1>
        <p>The link may have changed, or this page may not exist yet.</p>
        <RouterButton to="/">Back to home</RouterButton>
      </div>
    </section>
  );
}
