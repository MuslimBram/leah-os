import type { IntegrationPlugin } from "../types";

export const githubPlugin: IntegrationPlugin = {
  id: "github",
  name: "GitHub",
  vendor: "GitHub",
  category: "vcs",
  capabilities: ["vcs", "deploy"],
  status: "beta",
  description: "Single Source of Truth për repo/branch/commit/PR/CI. Kredenciali ruhet vetëm server-side si LEAH_GITHUB_TOKEN; browser-i nuk mban PAT.",
  docsUrl: "https://docs.github.com/en/rest",
  configSchema: [
    { key: "owner", label: "Default owner/org", type: "text", required: true },
    { key: "repo", label: "Default repository", type: "text", required: true },
  ],
  accent: "oklch(0.55 0.02 260)",
};
