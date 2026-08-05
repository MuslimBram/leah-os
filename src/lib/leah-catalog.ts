export type AiProvider = {
  id: string;
  name: string;
  vendor: string;
  specialty: string;
  strengths: string[];
  scores: { backend: number; frontend: number; docs: number; code: number; research: number; speed: number; cost: number };
  modelId?: string; // Lovable AI gateway model id if available
  mock?: boolean;
  color: string;
};

export const AI_CATALOG: AiProvider[] = [
  { id: "claude", name: "Claude", vendor: "Anthropic", specialty: "Backend & Reasoning", strengths: ["Backend", "SQL", "Long context"], scores: { backend: 95, frontend: 78, docs: 88, code: 92, research: 82, speed: 65, cost: 55 }, mock: true, color: "oklch(0.75 0.18 40)" },
  { id: "gpt", name: "GPT-5.4", vendor: "OpenAI", specialty: "Documentation & Nuance", strengths: ["Docs", "Planning", "Multimodal"], scores: { backend: 85, frontend: 82, docs: 95, code: 88, research: 78, speed: 72, cost: 60 }, modelId: "openai/gpt-5.4-mini", color: "oklch(0.75 0.18 150)" },
  { id: "gemini", name: "Gemini 3.6", vendor: "Google", specialty: "Google ecosystem & multimodal", strengths: ["Multimodal", "Search", "Speed"], scores: { backend: 80, frontend: 85, docs: 82, code: 84, research: 90, speed: 92, cost: 88 }, modelId: "google/gemini-3.6-flash", color: "oklch(0.75 0.18 240)" },
  { id: "codex", name: "Codex", vendor: "OpenAI", specialty: "Code generation", strengths: ["Code", "Refactor"], scores: { backend: 88, frontend: 80, docs: 60, code: 96, research: 55, speed: 75, cost: 62 }, mock: true, color: "oklch(0.72 0.20 130)" },
  { id: "cursor", name: "Cursor", vendor: "Anysphere", specialty: "Refactor Worker", strengths: ["Refactor", "In-repo edits"], scores: { backend: 78, frontend: 82, docs: 55, code: 90, research: 45, speed: 80, cost: 70 }, mock: true, color: "oklch(0.70 0.15 300)" },
  { id: "windsurf", name: "Windsurf", vendor: "Codeium", specialty: "Debug Worker", strengths: ["Debug", "Traces"], scores: { backend: 76, frontend: 74, docs: 60, code: 85, research: 50, speed: 78, cost: 72 }, mock: true, color: "oklch(0.70 0.18 200)" },
  { id: "lovable", name: "Lovable", vendor: "Lovable", specialty: "UI & MVP builder", strengths: ["UI", "Full-stack MVP"], scores: { backend: 78, frontend: 96, docs: 70, code: 82, research: 55, speed: 82, cost: 68 }, mock: true, color: "oklch(0.75 0.20 340)" },
  { id: "perplexity", name: "Perplexity", vendor: "Perplexity", specialty: "Live research", strengths: ["Research", "Citations"], scores: { backend: 40, frontend: 40, docs: 82, code: 45, research: 96, speed: 85, cost: 78 }, mock: true, color: "oklch(0.75 0.15 190)" },
  { id: "firecrawl", name: "Firecrawl", vendor: "Firecrawl", specialty: "Docs & scraping", strengths: ["Scrape", "Docs"], scores: { backend: 35, frontend: 30, docs: 92, code: 40, research: 90, speed: 88, cost: 82 }, mock: true, color: "oklch(0.72 0.18 60)" },
  { id: "deepseek", name: "DeepSeek", vendor: "DeepSeek", specialty: "Cheap code", strengths: ["Code", "Cost"], scores: { backend: 82, frontend: 78, docs: 70, code: 90, research: 65, speed: 78, cost: 96 }, mock: true, color: "oklch(0.70 0.18 260)" },
  { id: "grok", name: "Grok", vendor: "xAI", specialty: "Ideation", strengths: ["Brainstorm"], scores: { backend: 65, frontend: 68, docs: 70, code: 72, research: 78, speed: 80, cost: 65 }, mock: true, color: "oklch(0.72 0.20 20)" },
  { id: "mistral", name: "Mistral", vendor: "Mistral", specialty: "Fast tasks", strengths: ["Speed", "EU-hosted"], scores: { backend: 72, frontend: 72, docs: 75, code: 78, research: 68, speed: 94, cost: 85 }, mock: true, color: "oklch(0.72 0.15 275)" },
  { id: "llama", name: "Llama", vendor: "Meta", specialty: "Offline / self-host", strengths: ["Offline", "Open weights"], scores: { backend: 68, frontend: 65, docs: 65, code: 74, research: 60, speed: 72, cost: 98 }, mock: true, color: "oklch(0.70 0.15 100)" },
  { id: "qwen", name: "Qwen", vendor: "Alibaba", specialty: "Analysis", strengths: ["Analysis", "Multilingual"], scores: { backend: 76, frontend: 72, docs: 78, code: 82, research: 74, speed: 80, cost: 88 }, mock: true, color: "oklch(0.72 0.17 160)" },
  { id: "kimi", name: "Kimi K2", vendor: "Moonshot AI", specialty: "Agentic coding & long context", strengths: ["Agentic code", "Long context", "Tool use"], scores: { backend: 90, frontend: 84, docs: 80, code: 94, research: 80, speed: 76, cost: 92 }, mock: true, color: "oklch(0.74 0.16 320)" },
  { id: "glm", name: "GLM-4.6", vendor: "Z.ai", specialty: "Coding agent, cost efficient", strengths: ["Code", "Agents", "Cost"], scores: { backend: 86, frontend: 84, docs: 74, code: 92, research: 70, speed: 82, cost: 94 }, mock: true, color: "oklch(0.72 0.16 210)" },
  { id: "minimax", name: "MiniMax M2", vendor: "MiniMax", specialty: "Cheap agentic code", strengths: ["Code", "Agents", "Cost"], scores: { backend: 84, frontend: 82, docs: 72, code: 90, research: 68, speed: 88, cost: 95 }, mock: true, color: "oklch(0.73 0.18 350)" },
  { id: "bolt", name: "Bolt.new", vendor: "StackBlitz", specialty: "In-browser full-stack builder", strengths: ["UI", "Prototype", "Deploy"], scores: { backend: 70, frontend: 92, docs: 58, code: 84, research: 40, speed: 90, cost: 62 }, mock: true, color: "oklch(0.75 0.18 80)" },
  { id: "v0", name: "v0", vendor: "Vercel", specialty: "UI generation & Next.js", strengths: ["UI", "Next.js", "Design"], scores: { backend: 66, frontend: 95, docs: 62, code: 84, research: 42, speed: 88, cost: 66 }, mock: true, color: "oklch(0.78 0.02 265)" },
  { id: "replit", name: "Replit Agent", vendor: "Replit", specialty: "Build + host end-to-end", strengths: ["Full-stack", "Hosting", "DB"], scores: { backend: 82, frontend: 84, docs: 62, code: 86, research: 45, speed: 80, cost: 60 }, mock: true, color: "oklch(0.74 0.16 55)" },
  { id: "devin", name: "Devin", vendor: "Cognition", specialty: "Autonomous SWE agent", strengths: ["Autonomy", "Repo-wide", "PRs"], scores: { backend: 88, frontend: 80, docs: 70, code: 92, research: 62, speed: 55, cost: 35 }, mock: true, color: "oklch(0.70 0.14 250)" },
  { id: "antigravity", name: "Antigravity", vendor: "Google", specialty: "Agentic IDE & browser tasks", strengths: ["Agentic IDE", "Code", "Browser"], scores: { backend: 84, frontend: 86, docs: 68, code: 90, research: 72, speed: 78, cost: 70 }, mock: true, color: "oklch(0.72 0.20 260)" },
  { id: "base44", name: "Base44", vendor: "Wix", specialty: "No-code app builder", strengths: ["App builder", "Speed"], scores: { backend: 68, frontend: 88, docs: 55, code: 74, research: 40, speed: 92, cost: 64 }, mock: true, color: "oklch(0.74 0.17 130)" },
  { id: "emergent", name: "Emergent", vendor: "Emergent", specialty: "Agentic vibe-coding platform", strengths: ["Full-stack", "Agents"], scores: { backend: 78, frontend: 84, docs: 58, code: 82, research: 48, speed: 84, cost: 66 }, mock: true, color: "oklch(0.73 0.18 15)" },
];

export type SubTask = { id: string; kind: string; title: string; description: string; assignedAi: string; };

export const TASK_KINDS = [
  "backend", "frontend", "database", "auth", "api", "payments", "testing", "deployment", "documentation", "security",
] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

/** Pick the best AI for a given task kind. */
export function routeTaskToAi(kind: string): AiProvider {
  const scoreMap: Record<string, keyof AiProvider["scores"]> = {
    backend: "backend",
    database: "backend",
    api: "backend",
    auth: "backend",
    frontend: "frontend",
    ui: "frontend",
    payments: "backend",
    testing: "code",
    deployment: "code",
    documentation: "docs",
    security: "backend",
    research: "research",
  };
  const key = scoreMap[kind] ?? "code";
  return [...AI_CATALOG].sort((a, b) => b.scores[key] - a.scores[key])[0];
}

export type AiTeam = { id: string; name: string; tagline: string; roles: { role: string; ai: string }[] };

export const AI_TEAMS: AiTeam[] = [
  { id: "startup", name: "Startup Team", tagline: "Nga ideja te MVP në ditë", roles: [
    { role: "Product Manager", ai: "gpt" },
    { role: "Backend Developer", ai: "claude" },
    { role: "Frontend Developer", ai: "cursor" },
    { role: "QA", ai: "codex" },
    { role: "UI/UX", ai: "lovable" },
  ]},
  { id: "ecommerce", name: "E-commerce Team", tagline: "Shopify + Marketing + SEO", roles: [
    { role: "Shopify Expert", ai: "claude" },
    { role: "Marketing AI", ai: "gpt" },
    { role: "SEO AI", ai: "perplexity" },
    { role: "Ads AI", ai: "gemini" },
    { role: "CRM AI", ai: "qwen" },
  ]},
  { id: "enterprise", name: "Enterprise Team", tagline: "Arkitekturë, DevOps, siguri", roles: [
    { role: "Solution Architect", ai: "claude" },
    { role: "DevOps", ai: "deepseek" },
    { role: "Security", ai: "gpt" },
    { role: "Database Engineer", ai: "claude" },
    { role: "QA", ai: "codex" },
    { role: "Technical Writer", ai: "firecrawl" },
  ]},
];

export const AI_SKILLS = [
  "Shopify", "Odoo", "WordPress", "Flutter", "React", "Next.js", "Laravel",
  "Supabase", "PostgreSQL", "Docker", "Kubernetes", "SEO", "Facebook Ads", "Google Ads", "CRM",
];

export const DEPLOYMENT_TARGETS = ["Vercel", "Netlify", "Railway", "Fly.io", "Render", "Cloudflare", "Docker", "Kubernetes"];