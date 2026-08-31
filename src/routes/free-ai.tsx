import { createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { FREE_PROVIDERS, type FreeProvider } from "@/lib/gen/free-providers";
import { listByok, setByok, removeByok, subscribeByok } from "@/lib/gen/byok-store";
import { testCodeProvider } from "@/lib/gen/codegen.functions";
import { Check, CircleCheck, CircleX, KeyRound, Loader2, PlugZap, Zap } from "lucide-react";

export const Route = createFileRoute("/free-ai")({
  head: () => ({
    meta: [
      { title: "AI Code Providers — Leah AI OS" },
      { name: "description", content: "Lidh Kimi, Z.ai, Groq, OpenRouter, Cerebras, Ollama dhe providerë të tjerë për gjenerim real kodi, me Test Connection live." },
      { property: "og:title", content: "AI Code Providers — Leah AI OS" },
      { property: "og:description", content: "Providerë AI për gjenerim real kodi me certifikim live të endpoint/model." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreeAiPage,
});

const EMPTY_BYOK: ReturnType<typeof listByok> = {};

type ProbeState = {
  status: "testing" | "ok" | "error";
  message: string;
};

function useByok() {
  return useSyncExternalStore(subscribeByok, listByok, () => EMPTY_BYOK);
}

function FreeAiPage() {
  const cfgs = useByok();
  const [open, setOpen] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeState>>({});

  async function runProbe(p: FreeProvider) {
    const cfg = cfgs[p.id];
    const apiKey = cfg?.apiKey;
    const baseUrl = cfg?.baseUrl || p.baseUrl;
    const model = cfg?.model || p.models[0];

    if (p.needsKey && !apiKey) {
      setProbes((prev) => ({ ...prev, [p.id]: { status: "error", message: "Vendos API Key para testit." } }));
      return;
    }

    setProbes((prev) => ({ ...prev, [p.id]: { status: "testing", message: "Po testohet endpoint-i real…" } }));
    try {
      const result = await testCodeProvider({
        data: { providerId: p.id, apiKey, baseUrl, model },
      });
      setProbes((prev) => ({
        ...prev,
        [p.id]: {
          status: "ok",
          message: `${result.provider}/${result.model} · ${result.latencyMs} ms · ${result.sample}`,
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setProbes((prev) => ({ ...prev, [p.id]: { status: "error", message } }));
    }
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="AI Providers"
        title="Burime për gjenerim real — me provë live"
        description="Aktivizimi vetëm ruan konfigurimin. Test Connection bën një thirrje reale te endpoint-i dhe modeli i zgjedhur; vetëm PASS duhet konsideruar i certifikuar."
      />

      <div className="mb-6 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
        <div className="font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Si funksionon</div>
        <p className="text-muted-foreground mt-1">
          Nëse nuk aktivizon provider BYOK, Leah përdor Lovable AI Gateway kur ka çelës server-side; përndryshe provon Pollinations. Një konfigurim nuk quhet funksional pa Test Connection PASS.
        </p>
      </div>

      <div className="space-y-3">
        {FREE_PROVIDERS.map((p) => {
          const cfg = cfgs[p.id];
          const on = !!cfg?.enabled;
          const probe = probes[p.id];
          return (
            <div key={p.id} className={"rounded-xl border p-4 " + (on ? "border-primary bg-primary/5" : "border-border bg-card")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold flex items-center gap-2 flex-wrap">
                    {p.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{p.free}</span>
                    {!p.needsKey && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/40 text-emerald-400">pa çelës</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{p.vendor} · <span className="font-mono">{p.baseUrl}</span></div>
                  {p.note && <div className="text-xs text-muted-foreground mt-1">{p.note}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => setOpen(open === p.id ? null : p.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 inline-flex items-center gap-1"
                  >
                    <KeyRound className="h-3 w-3" /> Konfiguro
                  </button>
                  <button
                    onClick={() => void runProbe(p)}
                    disabled={probe?.status === "testing"}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 inline-flex items-center gap-1 disabled:opacity-60"
                  >
                    {probe?.status === "testing" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlugZap className="h-3 w-3" />}
                    Test Connection
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

              {probe && (
                <div className={"mt-3 flex items-start gap-2 text-xs rounded-lg border p-2.5 " + (probe.status === "ok" ? "border-emerald-500/30 text-emerald-400" : probe.status === "error" ? "border-destructive/30 text-destructive" : "border-border text-muted-foreground")}>
                  {probe.status === "ok" ? <CircleCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : probe.status === "error" ? <CircleX className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />}
                  <span className="break-all">{probe.message}</span>
                </div>
              )}

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
                      <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Merr/menaxho çelësin →</a>
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
