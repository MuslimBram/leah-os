import type { IntegrationPlugin } from "../types";

export const typedocPlugin: IntegrationPlugin = {
  id: "typedoc",
  name: "TypeDoc",
  vendor: "TypeDoc",
  category: "other",
  capabilities: ["document"],
  status: "stable",
  description: "Gjenero API reference & docs nga TypeScript.",
  docsUrl: "https://typedoc.org",
  accent: "oklch(0.72 0.15 250)",
};