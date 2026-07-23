import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { Check } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "AI Marketplace — Leah AI OS" },
      { name: "description", content: "Aktivizo AI-të me një klik. Managed ose BYOK." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const [active, setActive] = useState<Record<string, boolean>>({ gemini: true, gpt: true });
  const [mode, setMode] = useState<"managed" | "byok">("managed");
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="AI Marketplace" title="Aktivizo AI-të me një klik" description="Zgjedh cilat modele mund të përdorë Leah. Menaxho ndërmjet Managed dhe BYOK." />
      <div className="mb-6 inline-flex rounded-lg border border-border overflow-hidden">
        {(["managed", "byok"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={"px-4 py-2 text-sm " + (mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {m === "managed" ? "Managed (Leah paguan)" : "BYOK (Çelësi yt)"}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AI_CATALOG.map((ai) => {
          const on = !!active[ai.id];
          return (
            <button key={ai.id} onClick={() => setActive((s) => ({ ...s, [ai.id]: !s[ai.id] }))}
              className={"text-left rounded-xl border p-4 transition " + (on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold" style={{ background: ai.color, color: "oklch(0.15 0.02 265)" }}>
                    {ai.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{ai.name}</div>
                    <div className="text-xs text-muted-foreground">{ai.specialty}</div>
                  </div>
                </div>
                <div className={"h-5 w-5 rounded-full border flex items-center justify-center " + (on ? "bg-primary border-primary" : "border-border")}>
                  {on && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}