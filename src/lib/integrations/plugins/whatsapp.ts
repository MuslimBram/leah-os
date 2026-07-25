import type { IntegrationPlugin } from "../types";

export const whatsappPlugin: IntegrationPlugin = {
  id: "whatsapp",
  name: "WhatsApp Cloud API",
  vendor: "Meta",
  category: "messaging",
  capabilities: ["messaging"],
  status: "stable",
  description: "WhatsApp Business Cloud API zyrtare. Mesazhe, templates dhe webhooks.",
  docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  configSchema: [
    { key: "phoneNumberId", label: "Phone Number ID", type: "text", required: true },
    { key: "accessToken", label: "Access Token", type: "password", required: true },
    { key: "verifyToken", label: "Webhook Verify Token", type: "password" },
  ],
  accent: "oklch(0.75 0.16 145)",
};