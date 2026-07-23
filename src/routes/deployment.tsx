import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { DEPLOYMENT_TARGETS } from "@/lib/leah-catalog";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/deployment")({
  head: () => ({
    meta: [
      { title: "Deployment — Leah AI OS" },
      { name: "description", content: "Deploy në Vercel, Netlify, Railway, Fly.io, Cloudflare, Docker, K8s." },
    ],
  }),
  component: DeploymentPage,
});

function DeploymentPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Deployment" title="Ku dëshiron ta publikosh?" description="Leah pyet dhe orkestron deploy-in nëpër platformat më të përhapura." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DEPLOYMENT_TARGETS.map((t) => (
          <div key={t} className="rounded-xl border border-border bg-card p-5 text-center hover:border-primary/40 transition">
            <Rocket className="h-6 w-6 text-primary mx-auto" />
            <div className="mt-2 font-semibold">{t}</div>
            <div className="text-xs text-muted-foreground">1-click deploy</div>
          </div>
        ))}
      </div>
    </div>
  );
}