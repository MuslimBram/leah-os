import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG, AI_TEAMS } from "@/lib/leah-catalog";
import { ArrowRight, Workflow, Cpu, Brain, Users, Puzzle, ShieldCheck, DollarSign, Rocket, Github, Store, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leah AI OS — Dashboard i orkestrimit AI" },
      { name: "description", content: "Dashboard qendror i Leah AI OS: Planner, AI Router, Teams, Skills, Deployment dhe më shumë." },
    ],
  }),
  component: Dashboard,
});

const MODULES = [
  { to: "/planner", icon: Workflow, title: "Planner", desc: "Zbërthen çdo kërkesë në 8-10 nën-detyra teknike.", tag: "TRURI" },
  { to: "/router", icon: Cpu, title: "AI Router", desc: "Zgjedh vetë modelin më të mirë për çdo detyrë.", tag: "ZEMRA" },
  { to: "/teams", icon: Users, title: "AI Teams", desc: "Startup, E-commerce, Enterprise — ekipe të plota AI.", tag: "EKIPET" },
  { to: "/skills", icon: Puzzle, title: "AI Skills", desc: "Aftësi të instalueshme si Shopify, Flutter, K8s.", tag: "PLUGINS" },
  { to: "/memory", icon: Brain, title: "Memory", desc: "Vector DB për kontekst dhe kujtesë projekti.", tag: "KUJTESA" },
  { to: "/marketplace", icon: Store, title: "Marketplace", desc: "Aktivizo 15+ AI me një klik.", tag: "BYOK" },
  { to: "/github", icon: Github, title: "GitHub SSoT", desc: "Single Source of Truth për të gjitha AI-të.", tag: "REPO" },
  { to: "/deployment", icon: Rocket, title: "Deployment", desc: "Vercel, Railway, Fly, Cloudflare, K8s.", tag: "SHIP" },
  { to: "/security", icon: ShieldCheck, title: "Security", desc: "Vault, RBAC, AES-256, MFA, Audit Logs.", tag: "SIGURI" },
  { to: "/cost", icon: DollarSign, title: "Cost Optimizer", desc: "Arbitrazh inteligjent midis 15 AI-ve.", tag: "$$$" },
] as const;

function Dashboard() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl border border-border p-8 md:p-12 mb-10" style={{ background: "var(--grad-surface)" }}>
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-40 blur-3xl" style={{ background: "var(--grad-hero)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 text-primary text-xs tracking-widest uppercase">
            <Sparkles className="h-3 w-3" /> Leah AI OS
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight">
            <span className="grad-text">Lead • Empower</span>
            <br />
            <span className="text-foreground">Accelerate • Harmonize</span>
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground text-base md:text-lg">
            AI Operating System për krijimin automatik të Web Apps, Mobile Apps, AI Agents dhe SaaS.
            Leah nuk është chatbot — ajo është orkestruesja e të gjithë sistemit.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/planner" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition glow-primary">
              Nis Planner <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/router" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition">
              Shiko AI Router
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
            {[{ n: AI_CATALOG.length, l: "AI Models" }, { n: AI_TEAMS.length, l: "AI Teams" }, { n: 15, l: "Skills" }, { n: 8, l: "Deploy targets" }].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-card/50 px-4 py-3">
                <div className="text-2xl font-bold grad-text">{s.n}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageHeader eyebrow="Modulet e Sistemit" title="17 shtresa. Një orkestrues." description="Çdo modul është i pavarur dhe i gatshëm për integrime reale." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.to} to={m.to} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-all">
              <div className="absolute top-3 right-3 text-[10px] tracking-widest text-muted-foreground">{m.tag}</div>
              <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center text-primary group-hover:glow-primary transition">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold">{m.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                Hap modulin <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-14 rounded-3xl border border-border p-6 md:p-10" style={{ background: "var(--grad-surface)" }}>
        <PageHeader eyebrow="Arkitektura" title="LangGraph = Truri • n8n = Duart" description="Ndarja e të menduarit nga ekzekutimi — si korteksi dhe truri i vogël." />
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { t: "1. User Request", d: "Përdoruesi shkruan qëllimin." },
            { t: "2. Planner", d: "Leah zbërthen kërkesën në taska." },
            { t: "3. AI Router", d: "Çdo task shkon te AI më e mirë." },
            { t: "4. GitHub → Deploy", d: "Commit, review, ship." },
          ].map((s, i) => (
            <div key={s.t} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="text-xs text-primary font-mono">STEP 0{i + 1}</div>
              <div className="mt-1 font-semibold">{s.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}