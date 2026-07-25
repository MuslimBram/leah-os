import type { IntegrationPlugin } from "../types";

export const stripePlugin: IntegrationPlugin = {
  id: "stripe",
  name: "Stripe",
  vendor: "Stripe",
  category: "payments",
  capabilities: ["billing"],
  status: "stable",
  description: "Pagesa, abonime, webhooks. BYO Stripe account.",
  docsUrl: "https://stripe.com/docs/api",
  configSchema: [
    { key: "secretKey", label: "Secret Key", type: "password", required: true, placeholder: "sk_live_..." },
    { key: "webhookSecret", label: "Webhook Signing Secret", type: "password" },
  ],
  accent: "oklch(0.68 0.20 280)",
};