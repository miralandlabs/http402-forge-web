import { Link } from "react-router-dom";
import { useLocale } from "../hooks/useLocale";
import type { PortalDoor } from "../config/portalChannels";

interface PortalDoorCardProps {
  door: PortalDoor;
}

export function PortalDoorCard({ door }: PortalDoorCardProps) {
  const { msg } = useLocale();

  return (
    <Link to={door.to} className="portal-door-card">
      <h2>{msg(door.titleKey)}</h2>
      <p>{msg(door.descKey)}</p>
    </Link>
  );
}
