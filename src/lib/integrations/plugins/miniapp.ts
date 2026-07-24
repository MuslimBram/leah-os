import type { IntegrationPlugin } from "../types";

export const miniappPlugin: IntegrationPlugin = {
  id: "miniapp",
  name: "MiniApp Framework",
  vendor: "Open",
  category: "miniapp-framework",
  capabilities: ["generate-code"],
  status: "beta",
  description: "Adapter për framework-e mini-app (Telegram, Farcaster Frames, Line, WeChat).",
  configSchema: [
    { key: "target", label: "Target", type: "text", placeholder: "telegram | farcaster | line | wechat", required: true },
    { key: "botToken", label: "Bot / App Token", type: "password" },
  ],
  accent: "oklch(0.75 0.15 190)",
  invoke: async ({ payload }, { config }) => {
    const target = config.target || "telegram";
    return { ok: true, data: { target, scaffolded: payload } };
  },
};