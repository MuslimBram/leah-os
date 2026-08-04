// Sprint 8 — Self-evolving Skills + AI Teams.
// A skill is an installable knowledge pack that enriches agent prompts and
// levels up from execution feedback. Nothing in the core imports a skill.

export type SkillDomain =
  | "frontend"
  | "backend"
  | "database"
  | "devops"
  | "testing"
  | "documentation"
  | "marketing"
  | "commerce";

export type SkillLesson = {
  id: string;
  content: string;
  source: "execution" | "manual";
  ts: number;
};

export type Skill = {
  id: string;
  name: string;
  domain: SkillDomain;
  /** Task kinds this skill applies to. */
  kinds: string[];
  description: string;
  /** Base knowledge injected into the agent prompt. */
  knowledge: string[];
  /** Learned lessons — the self-evolving part. */
  lessons: SkillLesson[];
  installed: boolean;
  xp: number;
  level: number;
  usageCount: number;
  accent: string;
  updatedAt: number;
};

export type TeamActivation = {
  teamId: string;
  activatedAt: number;
  /** role -> provider id, snapshot at activation time. */
  roles: Record<string, string>;
};

/** XP needed for the next level. Levels are 1-based. */
export function xpForLevel(level: number): number {
  return level * 100;
}