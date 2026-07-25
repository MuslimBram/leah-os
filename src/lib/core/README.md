# Leah Core Abstractions

Base layer që lejon shtimin e integrimeve të reja (Antigravity, MiniApp
builders, GitHub, Claude, OpenAI, Supabase, n8n, MCP Servers, etj.) pa
ndryshuar logjikën kryesore.

| Module | Përgjegjësia |
|---|---|
| `event-bus.ts` | Typed pub/sub për ngjarje globale (plugin, ai, connector, webhook, pipeline). |
| `ai-provider.ts` | Abstraksion i AI Providers. Çdo model chat/codegen implementon `AIProvider`. |
| `connectors.ts` | Registry deklarativ për shërbime të jashtme (VCS, DB, MCP, deploy, codegen). |
| `webhooks.ts` | Dispatch i webhooks përmes `/api/public/webhooks/:source`. |

## Rregull i artë

Core (Planner, Router, Pipeline, UI) **nuk importon** SDK-në e një shërbimi
konkret. Ai flet vetëm me këto abstraksione + `invokePlugin(...)` nga
`src/lib/integrations/registry.ts`.

## Si të shtoj një integrim të ri?

1. **Plugin capability** (gjeneron/teston/deploy/etc.) → shto skedar në
   `src/lib/integrations/plugins/*.ts` dhe rregjistroje në `registry.ts`.
2. **AI model** → `registerAIProvider({ id, label, models, complete })`.
3. **Shërbim i jashtëm** (GitHub, Supabase, MCP server) →
   `registerConnector({ id, kind, auth, actions })`.
4. **Webhook** (GitHub push, Stripe event, n8n callback) →
   `registerWebhook("github", handler)` dhe krijo route publike që thërret
   `dispatchWebhook`.

Asnjë hap nuk kërkon ndryshim në kodin bazë.