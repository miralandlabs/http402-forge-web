import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";

export function HomePage() {
  const { msg } = useLocale();

  return (
    <section className="hero">
      <h1>{msg("homeTitle")}</h1>
      <p>{msg("homeBody")}</p>
      <div className="actions" style={{ marginTop: "1.5rem" }}>
        <Link to="/forge">
          <button type="button" className="control-btn primary">
            {msg("homeBrowseCta")}
          </button>
        </Link>
        <Link to="/sell">
          <button type="button" className="control-btn">
            {msg("homeSellCta")}
          </button>
        </Link>
      </div>
    </section>
  );
}
