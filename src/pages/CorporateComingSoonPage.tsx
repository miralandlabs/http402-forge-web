import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";

export function CorporateComingSoonPage() {
  const { msg } = useLocale();

  return (
    <>
      <p className="portal-back">
        <Link to="/">{msg("portalBackToHub")}</Link>
      </p>
      <section className="hero portal-hero">
        <h1>{msg("portalCorporateTitle")}</h1>
        <p>{msg("portalCorporateSubtitle")}</p>
        <span className="badge-coming-soon badge-coming-soon--inline">{msg("portalComingSoon")}</span>
      </section>
    </>
  );
}
