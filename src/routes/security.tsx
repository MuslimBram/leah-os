import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { ShieldCheck, KeyRound, Lock, UserCheck, ScrollText, Fingerprint, Timer, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Leah AI OS" },
      { name: "description", content: "Vault, AES-256, OAuth, RBAC, Audit Logs, MFA, Rate Limiting, Secrets Rotation." },
    ],
  }),
  component: SecurityPage,
});

const LAYERS = [
  { icon: KeyRound, t: "Vault", d: "Për të gjitha API Keys" },
  { icon: Lock, t: "AES-256", d: "Encryption at rest" },
  { icon: UserCheck, t: "OAuth + RBAC", d: "Role-based access control" },
  { icon: ScrollText, t: "Audit Logs", d: "Çdo veprim i regjistruar" },
  { icon: Fingerprint, t: "MFA", d: "Multi-factor authentication" },
  { icon: Timer, t: "Rate Limiting", d: "Mbrojtje nga abuzimi" },
  { icon: RotateCcw, t: "Secrets Rotation", d: "Rotim automatik i çelësave" },
  { icon: ShieldCheck, t: "AI Sandbox", d: "Ekzekutim i izoluar" },
];

function SecurityPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Security" title="Enterprise-grade nga dita e parë" description="Sepse orkestrimi i 15 AI-ve pa siguri është një dritare e hapur." />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {LAYERS.map((l) => {
          const I = l.icon;
          return (
            <div key={l.t} className="rounded-xl border border-border bg-card p-4">
              <I className="h-5 w-5 text-primary" />
              <div className="mt-2 font-semibold">{l.t}</div>
              <div className="text-xs text-muted-foreground mt-1">{l.d}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}