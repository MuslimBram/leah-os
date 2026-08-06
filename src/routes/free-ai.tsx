import { createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { FREE_PROVIDERS } from "@/lib/gen/free-providers";
import { listByok, setByok, removeByok, subscribeByok } from "@/lib/gen/byok-store";
import { Check, KeyRound, Zap } from "lucide-react";

export const Route = createFileRoute("/free-ai")({
  head: () => ({
    meta: [
      { title: "Free AI Providers — Leah AI OS" },
      { name: "description", content: "Lidh Z.ai, DeepAI, Groq, OpenRouter, Cerebras, Ollama dhe të tjera falas për gjenerim real kodi." },
      { property: "og:title", content: "Free AI Providers — Leah AI OS" },
      { property: "og:description", content: "Burime falas AI për gjenerim real kodi brenda Leah AI OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreeAiPage,
});

const EMPTY_BYOK: ReturnType<typeof listByok> = {};

function useByok() {
  return useSyncExternalStore(subscribeByok, listByok, () => EMPTY_BYOK);
}

function FreeAiPage() {
  const cfgs = useByok();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Free AI"
        title="Burime falas për gjenerim real"
        description="Aktivizo një provider falas ose BYOK. Agjentët e Leah thërrasin realisht këtë endpoint kur gjenerojnë kod."
      />

      <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
        <div className="font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Si funksionon</div>
        <p className="text-muted-foreground mt-1">
          Nëse nuk aktivizon asnjë provider, Leah përdor Lovable AI Gateway; nëse mungon edhe ai, bie te Pollinations (pa çelës).
          Provideri i parë i aktivizuar këtu ka përparësi.
        </p>
      </div>

      <div className="space-y-3">
        {FREE_PROVIDERS.map((p) => {
          const cfg = cfgs[p.id];
          const on = !!cfg?.enabled;
          return (
            <div key={p.id} className={"rounded-xl border p-4 " + (on ? "border-primary bg-primary/5" : "border-border bg-card")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {p.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{p.free}</span>
                    {!p.needsKey && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">pa çelës</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{p.vendor} · <span className="font-mono">{p.baseUrl}</span></div>
                  {p.note && <div className="text-xs text-muted-foreground mt-1">{p.note}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setOpen(open === p.id ? null : p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 inline-flex items-center gap-1"
                  >
                    <KeyRound className="h-3 w-3" /> Konfiguro
                  </button>
                  <button
                    onClick={() =>
                      on
                        ? setByok({ ...(cfg ?? { providerId: p.id }), providerId: p.id, enabled: false })
                        : setByok({
                            providerId: p.id,
                            apiKey: cfg?.apiKey,
                            baseUrl: cfg?.baseUrl || p.baseUrl,
                            model: cfg?.model || p.models[0],
                            enabled: true,
                          })
                    }
                    className={"text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 " + (on ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/50")}
                  >
                    {on && <Check className="h-3 w-3" />} {on ? "Aktiv" : "Aktivizo"}
                  </button>
                </div>
              </div>

              {open === p.id && (
                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                  <label className="text-xs text-muted-foreground">
                    API Key
                    <input
                      type="password"
                      defaultValue={cfg?.apiKey ?? ""}
                      placeholder={p.needsKey ? "sk-…" : "nuk nevojitet"}
                      onBlur={(e) => setByok({ providerId: p.id, apiKey: e.target.value, baseUrl: cfg?.baseUrl || p.baseUrl, model: cfg?.model || p.models[0], enabled: cfg?.enabled ?? false })}
                      className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Base URL
                    <input
                      defaultValue={cfg?.baseUrl ?? p.baseUrl}
                      onBlur={(e) => setByok({ providerId: p.id, apiKey: cfg?.apiKey, baseUrl: e.target.value, model: cfg?.model || p.models[0], enabled: cfg?.enabled ?? false })}
                      className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm font-mono text-foreground"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Model
                    <select
                      defaultValue={cfg?.model ?? p.models[0]}
                      onChange={(e) => setByok({ providerId: p.id, apiKey: cfg?.apiKey, baseUrl: cfg?.baseUrl || p.baseUrl, model: e.target.value, enabled: cfg?.enabled ?? false })}
                      className="mt-1 w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground"
                    >
                      {p.models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <div className="sm:col-span-3 flex items-center gap-3">
                    {p.signupUrl && (
                      <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Merr çelësin falas →</a>
                    )}
                    <button onClick={() => removeByok(p.id)} className="text-xs text-muted-foreground hover:text-destructive">Fshi konfigurimin</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}