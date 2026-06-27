import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";
import type { SovereignChannel } from "../config/portalChannels";

interface PortalChannelCardProps {
  channel: SovereignChannel;
}

export function PortalChannelCard({ channel }: PortalChannelCardProps) {
  const { msg } = useLocale();
  const title = msg(channel.titleKey);
  const desc = msg(channel.descKey);

  const body = (
    <>
      {channel.link.kind === "comingSoon" ? (
        <span className="badge-coming-soon">{msg("portalComingSoon")}</span>
      ) : null}
      <h3>{title}</h3>
      <p>{desc}</p>
    </>
  );

  if (channel.link.kind === "comingSoon") {
    return (
      <div className="portal-channel-card portal-channel-card--disabled" aria-disabled="true">
        {body}
      </div>
    );
  }

  if (channel.link.kind === "external") {
    return (
      <a
        className="portal-channel-card"
        href={channel.link.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
      </a>
    );
  }

  return (
    <Link className="portal-channel-card" to={channel.link.to}>
      {body}
    </Link>
  );
}
