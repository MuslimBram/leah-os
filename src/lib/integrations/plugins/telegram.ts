import type { IntegrationPlugin } from "../types";

export const telegramPlugin: IntegrationPlugin = {
  id: "telegram",
  name: "Telegram Bot API",
  vendor: "Telegram",
  category: "messaging",
  capabilities: ["messaging"],
  status: "stable",
  description: "Bot API + Mini Apps. Njoftime, komanda dhe UI të embeduara në Telegram.",
  docsUrl: "https://core.telegram.org/bots/api",
  configSchema: [
    { key: "botToken", label: "Bot Token", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.15 220)",
};