export const NPM_AGENT_TOOLING = {
  forgeSdk: {
    name: "@http402/forge-client",
    url: "https://www.npmjs.com/package/@http402/forge-client",
    install: "npm install @http402/forge-client",
  },
  cli: {
    name: "@http402/forge-cli",
    url: "https://www.npmjs.com/package/@http402/forge-cli",
    bin: "forge",
    install: "npm install -g @http402/forge-cli",
    run: "npx @http402/forge-cli list --pretty",
  },
  mcp: {
    name: "@http402/forge-mcp",
    url: "https://www.npmjs.com/package/@http402/forge-mcp",
    bin: "forge-mcp",
    run: "npx -y @http402/forge-mcp",
  },
  agentApiUrl:
    "https://github.com/miralandlabs/http402-forge-api/blob/main/docs/AGENT_API.md",
} as const;

export const FORGE_MCP_SNIPPET = `{
  "mcpServers": {
    "forge": {
      "command": "npx",
      "args": ["-y", "@http402/forge-mcp"],
      "env": {
        "FORGE_API_BASE": "https://preview.forge.http402.trade",
        "FACILITATOR_BASE": "https://preview.ipay.sh",
        "FORGE_KEYPAIR": "/absolute/path/to/keypair.json"
      }
    }
  }
}`;
