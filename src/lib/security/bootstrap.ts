// Wires the security layer into the OS: seeds demo secrets and mirrors core
// events into the audit log.

import { on } from "@/lib/core/event-bus";
import { audit } from "./audit";
import { currentPrincipal } from "./rbac";
import { putSecret } from "./vault";

let installed = false;

export function installSecurityBootstrap() {
  if (installed) return;
  installed = true;

  void putSecret({ name: "OPENAI_API_KEY", scope: "global", value: "sk-demo-1234567890abcdef" });
  void putSecret({ name: "GITHUB_TOKEN", scope: "github", value: "ghp_demoTokenValue0099" });
  void putSecret({ name: "SUPABASE_SERVICE_KEY", scope: "supabase", value: "sb_secret_demo_7788" });

  on((e) => {
    const p = currentPrincipal();
    if (e.type === "connector.connected" || e.type === "connector.disconnected") {
      audit({ actor: p.name, actorRole: p.role, action: e.type, target: e.id, outcome: "info" });
    } else if (e.type === "plugin.invoked") {
      audit({
        actor: p.name, actorRole: p.role, action: `plugin.${e.capability}`,
        target: e.id, outcome: "info", detail: e.ok ? "sukses" : "dështoi",
      });
    } else if (e.type === "webhook.received") {
      audit({ actor: `webhook:${e.source}`, actorRole: "agent", action: "webhook.received", target: e.event, outcome: "info" });
    }
  });
}