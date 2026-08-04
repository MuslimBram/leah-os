// Built-in skill packs. Add or remove entries freely — the engine only reads
// whatever the store contains.

import type { Skill } from "./types";

type Seed = Omit<Skill, "lessons" | "installed" | "xp" | "level" | "usageCount" | "updatedAt">;

export const SKILL_SEEDS: Seed[] = [
  {
    id: "react", name: "React Expert", domain: "frontend", kinds: ["frontend", "ui"],
    description: "Komponentë të pastër, state management dhe performancë render.",
    knowledge: [
      "Ndaj UI-në në komponentë të vegjël me një përgjegjësi.",
      "Shmang state globale kur një prop mjafton; memoizo vetëm kur matet problem.",
      "Përdor design tokens në vend të ngjyrave hardcoded.",
    ],
    accent: "oklch(0.75 0.20 340)",
  },
  {
    id: "supabase", name: "Supabase Expert", domain: "database", kinds: ["database", "backend"],
    description: "Skema, RLS, migrime dhe Data API grants.",
    knowledge: [
      "Çdo tabelë publike kërkon GRANT-e krahas RLS-së.",
      "Rolet ruaji në tabelë të veçantë, kurrë në profiles.",
      "Përdor security definer functions për kontroll rolesh pa rekursion.",
    ],
    accent: "oklch(0.72 0.18 160)",
  },
  {
    id: "docker", name: "Docker Expert", domain: "devops", kinds: ["deployment"],
    description: "Image sa më të vogla, multi-stage build, health checks.",
    knowledge: [
      "Përdor multi-stage builds dhe base image alpine kur mundesh.",
      "Cache layers duke kopjuar fillimisht manifestin e varësive.",
      "Shto HEALTHCHECK dhe përdorues jo-root.",
    ],
    accent: "oklch(0.72 0.18 240)",
  },
  {
    id: "testing", name: "Testing Expert", domain: "testing", kinds: ["testing"],
    description: "Unit, integration dhe E2E me mbulim të rrjedhave kritike.",
    knowledge: [
      "Testo sjelljen, jo implementimin.",
      "Një assert kryesor për test; emërto testet si specifikime.",
      "Mbulo rrjedhat kritike me E2E, pjesën tjetër me unit.",
    ],
    accent: "oklch(0.72 0.20 130)",
  },
  {
    id: "shopify", name: "Shopify Expert", domain: "commerce", kinds: ["frontend", "backend"],
    description: "Storefront API, checkout dhe apps.",
    knowledge: [
      "Përdor Storefront API për lexime publike, Admin API vetëm në server.",
      "Webhook-et verifikoji me HMAC përpara përpunimit.",
    ],
    accent: "oklch(0.75 0.18 140)",
  },
  {
    id: "seo", name: "SEO Expert", domain: "marketing", kinds: ["frontend", "documentation"],
    description: "Meta, semantikë dhe performancë.",
    knowledge: [
      "Një H1 për faqe, title < 60 karaktere, description < 160.",
      "Shto JSON-LD dhe canonical kur ka kuptim.",
    ],
    accent: "oklch(0.75 0.18 60)",
  },
  {
    id: "docs", name: "Docs Expert", domain: "documentation", kinds: ["documentation"],
    description: "README, API reference dhe udhëzues.",
    knowledge: [
      "Fillo me çfarë bën dhe si nisesh brenda 10 rreshtash.",
      "Çdo shembull kodi duhet të jetë i ekzekutueshëm.",
    ],
    accent: "oklch(0.75 0.18 150)",
  },
  {
    id: "kubernetes", name: "Kubernetes Expert", domain: "devops", kinds: ["deployment"],
    description: "Deploy, scaling dhe monitorim.",
    knowledge: [
      "Vendos requests/limits për çdo container.",
      "Përdor readiness + liveness probes për rollout të sigurt.",
    ],
    accent: "oklch(0.72 0.16 250)",
  },
];