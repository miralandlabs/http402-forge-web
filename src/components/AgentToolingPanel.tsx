import { FORGE_MCP_SNIPPET, NPM_AGENT_TOOLING } from "../config/agentTooling";
import { useLocale } from "../hooks/useLocale";

interface AgentToolingPanelProps {
  /** Collapsed `<details>` for seller page footer — keeps CLI/MCP out of the main funnel. */
  collapsed?: boolean;
}

function AgentToolingContent() {
  const { msg } = useLocale();

  return (
    <>
      <p className="agent-tooling-lead">{msg("agentToolingLead")}</p>
      <ul className="agent-tooling-packages">
        <li>
          <a href={NPM_AGENT_TOOLING.cli.url} target="_blank" rel="noreferrer">
            {NPM_AGENT_TOOLING.cli.name}
          </a>
          <code>{NPM_AGENT_TOOLING.cli.run}</code>
        </li>
        <li>
          <a href={NPM_AGENT_TOOLING.forgeSdk.url} target="_blank" rel="noreferrer">
            {NPM_AGENT_TOOLING.forgeSdk.name}
          </a>
          <code>{NPM_AGENT_TOOLING.forgeSdk.install}</code>
        </li>
        <li>
          <a href={NPM_AGENT_TOOLING.mcp.url} target="_blank" rel="noreferrer">
            {NPM_AGENT_TOOLING.mcp.name}
          </a>
          <code>{NPM_AGENT_TOOLING.mcp.run}</code>
        </li>
      </ul>
      <details className="agent-tooling-mcp">
        <summary>{msg("agentToolingMcpSummary")}</summary>
        <pre>
          <code>{FORGE_MCP_SNIPPET}</code>
        </pre>
      </details>
      <p className="agent-tooling-docs">
        <a href={NPM_AGENT_TOOLING.agentApiUrl} target="_blank" rel="noreferrer">
          {msg("agentToolingDocsLink")}
        </a>
        {" · "}
        <a href="/.well-known/x402-portal.json" target="_blank" rel="noreferrer">
          {msg("agentToolingPortalManifest")}
        </a>
      </p>
    </>
  );
}

export function AgentToolingPanel({ collapsed = false }: AgentToolingPanelProps) {
  const { msg } = useLocale();

  if (collapsed) {
    return (
      <details className="agent-tooling agent-tooling--collapsed">
        <summary>{msg("agentToolingCollapsedSummary")}</summary>
        <AgentToolingContent />
      </details>
    );
  }

  return (
    <section className="agent-tooling" aria-labelledby="agent-tooling-title">
      <h2 id="agent-tooling-title">{msg("agentToolingTitle")}</h2>
      <AgentToolingContent />
    </section>
  );
}
