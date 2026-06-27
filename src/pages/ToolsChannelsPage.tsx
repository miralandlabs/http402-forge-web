import { Link } from "react-router-dom";
import { toolChannels } from "../config/portalChannels";
import { useLocale } from "../hooks/useLocale";

export function ToolsChannelsPage() {
  const { msg } = useLocale();

  return (
    <>
      <p className="portal-back">
        <Link to="/sovereign">{msg("portalBackToSovereign")}</Link>
      </p>
      <section className="hero portal-hero">
        <h1>{msg("portalToolsTitle")}</h1>
        <p>{msg("portalToolsSubtitle")}</p>
      </section>
      <div className="grid portal-channel-grid">
        {toolChannels.map((tool) => (
          <a
            key={tool.id}
            className="portal-channel-card"
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3>{msg(tool.titleKey)}</h3>
            <p>{msg(tool.descKey)}</p>
          </a>
        ))}
      </div>
    </>
  );
}
