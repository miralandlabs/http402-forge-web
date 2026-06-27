import { Link } from "react-router-dom";
import { PortalChannelCard } from "../components/PortalChannelCard";
import { sovereignChannels } from "../config/portalChannels";
import { useLocale } from "../hooks/useLocale";

export function SovereignChannelsPage() {
  const { msg } = useLocale();

  return (
    <>
      <p className="portal-back">
        <Link to="/">{msg("portalBackToHub")}</Link>
      </p>
      <section className="hero portal-hero">
        <h1>{msg("portalSovereignTitle")}</h1>
        <p>{msg("portalSovereignSubtitle")}</p>
      </section>
      <div className="grid portal-channel-grid">
        {sovereignChannels.map((channel) => (
          <PortalChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </>
  );
}
