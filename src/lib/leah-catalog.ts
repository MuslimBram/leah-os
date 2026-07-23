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