import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory — Leah AI OS" },
      { name: "description", content: "Vector DB dhe kujtesa e projekteve për orkestrimin AI." },
    ],
  }),
  component: MemoryPage,
});

const LAYERS = [
  { t: "Projekte", d: "Metadata, versione dhe kontekst për çdo build." },
  { t: "Prompte & Historik", d: "Çdo prompt i mëparshëm, i indeksueshëm semantikisht." },
  { t: "Gabime", d: "Fingerprint të gabimeve për të mos i përsëritur." },
  { t: "API Keys", d: "BYOK — të enkriptuara në Vault." },
  { t: "Preferencat", d: "Stil kodi, konventa, gjuhë e preferuar." },
  { t: "Modelet & Versionet", d: "Cili AI ka punuar në cilin file." },
  { t: "Deployments", d: "Historiku i deploy-eve nga çdo ambient." },
  { t: "Kod semantik", d: "Embeddings të kodit për ripërdorim." },
];

function MemoryPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Memory" title="Kujtesa që mungon te shumica" description="Supabase pgvector / Qdrant / Weaviate për kërkim semantik në kod, dokumentacion dhe historik." />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {LAYERS.map((l) => (
          <div key={l.t} className="rounded-xl border border-border bg-card p-4">
            <Brain className="h-4 w-4 text-primary" />
            <div className="mt-2 font-semibold text-sm">{l.t}</div>
            <div className="text-xs text-muted-foreground mt-1">{l.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}