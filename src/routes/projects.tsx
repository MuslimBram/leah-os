import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { FolderKanban, Plus } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Leah AI OS" },
      { name: "description", content: "Menaxho projektet e ndërtuara nga Leah." },
    ],
  }),
  component: ProjectsPage,
});

const DEMO = [
  { name: "AirVibe", desc: "Klon Airbnb me pagesa Stripe", status: "In Progress", tasks: 8, ai: 5 },
  { name: "InvoicePilot", desc: "SaaS për faturim automatik", status: "Deployed", tasks: 12, ai: 6 },
  { name: "MailAgent", desc: "AI agent për email support", status: "Planning", tasks: 4, ai: 3 },
];

function ProjectsPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <PageHeader eyebrow="Projektet" title="Ndërtimet e tua në Leah" description="GitHub është Single Source of Truth për çdo projekt." />
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary">
          <Plus className="h-4 w-4" /> Projekt i ri
        </button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO.map((p) => (
          <div key={p.name} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded-full border border-border text-muted-foreground">{p.status}</span>
              <div className="text-muted-foreground">{p.tasks} taska · {p.ai} AI</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}