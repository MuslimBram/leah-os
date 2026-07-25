import type { IntegrationPlugin } from "../types";

export const githubPlugin: IntegrationPlugin = {
  id: "github",
  name: "GitHub",
  vendor: "GitHub",
  category: "vcs",
  capabilities: ["vcs", "deploy"],
  status: "stable",
  description: "Single source of truth për repos, PRs dhe Actions. OAuth ose Personal Access Token.",
  docsUrl: "https://docs.github.com/en/rest",
  configSchema: [
    { key: "token", label: "Personal Access Token", type: "password", required: true, help: "Scopes: repo, workflow" },
    { key: "owner", label: "Default owner/org", type: "text" },
  ],
  accent: "oklch(0.55 0.02 260)",
  invoke: async ({ capability, payload }, { config }) => {
    if (!config.token) return { ok: false, message: "Mungon GitHub token" };
    return { ok: true, data: { capability, payload, owner: config.owner ?? null } };
  },
};