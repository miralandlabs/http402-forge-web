import { PortalDoorCard } from "../components/PortalDoorCard";
import { FloatingCommunity } from "../components/FloatingCommunity";
import { portalDoors } from "../config/portalChannels";
import { useLocale } from "../hooks/useLocale";

export function PortalHomePage() {
  const { msg } = useLocale();

  return (
    <section className="hero portal-hero">
      <h1>{msg("portalHubTitle")}</h1>
      <p>{msg("portalHubSubtitle")}</p>
      <div className="portal-doors">
        {portalDoors.map((door) => (
          <PortalDoorCard key={door.id} door={door} />
        ))}
      </div>
      <FloatingCommunity />
    </section>
  );
}
