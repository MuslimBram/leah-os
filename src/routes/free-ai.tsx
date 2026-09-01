import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { FREE_PROVIDERS } from "@/lib/gen/free-providers";
import { KeyRound, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/free-ai")({
  head: () => ({
    meta: [
      { title: "AI Providers — Leah AI OS" },
      { name: "description", content: "Provider registry for LEAH AI OS. Credentials are configured server-side or through Pulse Vault; browser-stored keys are disabled." },
      { property: "og:title", content: "AI Providers — Leah AI OS" },
      { property: "og:description", content: "Server-authoritative AI provider configuration for LEAH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreeAiPage,
});

function FreeAiPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="AI Providers"
        title="Provider registry — server-authoritative"
        description="MR7A nuk ruan më API keys ose Base URL në browser. Managed credentials vijnë vetëm nga server environment; workspace BYOK do të lidhet me Pulse Vault dhe session/RBAC para se të aktivizohet."
      />

      <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm space-y-2">
        <div className="font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Security boundary aktiv
        </div>
        <p className="text-muted-foreground">
          Test Connection publik dhe konfigurimi i raw API key/Base URL janë çaktivizuar. Kjo mbyll SSRF, key-validation oracle dhe managed-spend pa autentikim.
        </p>
        <p className="text-muted-foreground">
          Një provider do të shënohet LIVE vetëm pasi një runtime i autentikuar të regjistrojë success + induced failure + usage/audit evidence.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm">
        <div className="font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Funding modes</div>
        <p className="text-muted-foreground mt-1">
          BYOK dhe managed janë dy zinxhirë të veçantë. Një kërkesë BYOK nuk kalon kurrë automatikisht në managed fallback.
        </p>
      </div>

      <div className="space-y-3">
        {FREE_PROVIDERS.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold flex items-center gap-2 flex-wrap">
                  {p.name}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{p.free}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{p.vendor}</div>
                {p.note && <div className="text-xs text-muted-foreground mt-1">{p.note}</div>}
                <div className="text-xs text-muted-foreground mt-2">
                  Models shown here are discovery hints only and are not proof of account access or LIVE status.
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.models.map((model) => (
                    <span key={model} className="font-mono text-[10px] px-2 py-1 rounded-md border border-border">{model}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/30 text-amber-400 inline-flex items-center gap-1">
                  <KeyRound className="h-3 w-3" /> Vault/server setup required
                </span>
                {p.signupUrl && (
                  <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Provider console →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
