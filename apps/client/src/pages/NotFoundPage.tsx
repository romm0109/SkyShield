import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="page">
      <section className="card waiting-shell">
        <p className="eyebrow">404</p>
        <h1>Route Not Found</h1>
        <p>This page does not exist in SkyShield.</p>
        <div className="button-row">
          <Link className="button-link" to="/">
            Back to Lobby
          </Link>
        </div>
      </section>
    </main>
  );
}
