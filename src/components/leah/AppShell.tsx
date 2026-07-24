import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Workflow, Cpu, FolderKanban, Users, Puzzle,
  Rocket, ShieldCheck, DollarSign, Github, Store, Brain, Boxes, GitBranch,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: Workflow },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/router", label: "AI Router", icon: Cpu },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/teams", label: "AI Teams", icon: Users },
  { to: "/skills", label: "AI Skills", icon: Puzzle },
  { to: "/integrations", label: "Integrations", icon: Boxes },
  { to: "/memory", label: "Memory", icon: Brain },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/github", label: "GitHub", icon: Github },
  { to: "/deployment", label: "Deployment", icon: Rocket },
  { to: "/security", label: "Security", icon: ShieldCheck },
  { to: "/cost", label: "Cost Optimizer", icon: DollarSign },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-5 py-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-xl grad-text glow-primary flex items-center justify-center" style={{ background: "var(--grad-hero)" }}>
              <span className="text-primary-foreground font-black text-lg">L</span>
            </div>
            <div>
              <div className="text-sm font-black tracking-widest text-sidebar-foreground">LEAH</div>
              <div className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">AI Operating System</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all " +
                  (active
                    ? "bg-sidebar-accent text-sidebar-primary shadow-[inset_0_0_0_1px_var(--sidebar-border)]"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60")
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border text-[11px] text-muted-foreground">
          <div>Lead • Empower • Accelerate • Harmonize</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-30 bg-sidebar/90 backdrop-blur border-b border-sidebar-border px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={"text-xs px-2.5 py-1 rounded-full whitespace-nowrap " + (active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/70 border border-sidebar-border")}>
                {item.label}
              </Link>
            );
          })}
        </div>
        {children}
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="text-xs tracking-[0.25em] uppercase text-primary mb-2">{eyebrow}</div>}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-2 text-muted-foreground max-w-2xl">{description}</p>}
    </div>
  );
}