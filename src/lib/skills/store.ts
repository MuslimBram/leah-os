// Skill + team-activation store — client-side, persisted, subscribable.

import { SKILL_SEEDS } from "./catalog";
import type { Skill, SkillLesson, TeamActivation } from "./types";
import { xpForLevel } from "./types";

const SKILL_KEY = "leah:skills:v1";
const TEAM_KEY = "leah:team:v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function seedSkills(): Skill[] {
  const now = Date.now();
  return SKILL_SEEDS.map((s) => ({
    ...s, lessons: [], installed: false, xp: 0, level: 1, usageCount: 0, updatedAt: now,
  }));
}

function hydrate(): Skill[] {
  const stored = read<Skill[]>(SKILL_KEY);
  const base = seedSkills();
  if (!stored) return base;
  // Merge: seed definitions win for static fields, stored progress is kept.
  return base.map((s) => {
    const prev = stored.find((p) => p.id === s.id);
    return prev ? { ...s, lessons: prev.lessons ?? [], installed: !!prev.installed, xp: prev.xp ?? 0, level: prev.level ?? 1, usageCount: prev.usageCount ?? 0, updatedAt: prev.updatedAt ?? s.updatedAt } : s;
  });
}

let skills: Skill[] = hydrate();
let activeTeam: TeamActivation | null = read<TeamActivation>(TEAM_KEY);
const listeners = new Set<() => void>();

export function subscribeSkills(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
  write(SKILL_KEY, skills);
  write(TEAM_KEY, activeTeam);
}

export function listSkills(): Skill[] {
  return [...skills];
}
export function getSkill(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
export function installedSkills(): Skill[] {
  return skills.filter((s) => s.installed);
}

export function installSkill(id: string) {
  const s = getSkill(id);
  if (!s || s.installed) return;
  s.installed = true;
  s.updatedAt = Date.now();
  notify();
}

export function uninstallSkill(id: string) {
  const s = getSkill(id);
  if (!s || !s.installed) return;
  s.installed = false;
  s.updatedAt = Date.now();
  notify();
}

/** Grant XP; levels up as thresholds are crossed. Returns the new level. */
export function grantXp(id: string, amount: number): number {
  const s = getSkill(id);
  if (!s) return 0;
  s.xp += Math.max(0, amount);
  s.usageCount += 1;
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level += 1;
  }
  s.updatedAt = Date.now();
  notify();
  return s.level;
}

const MAX_LESSONS = 12;

export function addLesson(id: string, content: string, source: SkillLesson["source"] = "execution") {
  const s = getSkill(id);
  if (!s) return;
  const trimmed = content.trim().slice(0, 400);
  if (!trimmed || s.lessons.some((l) => l.content === trimmed)) return;
  s.lessons.push({
    id: `les_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    content: trimmed, source, ts: Date.now(),
  });
  if (s.lessons.length > MAX_LESSONS) s.lessons.splice(0, s.lessons.length - MAX_LESSONS);
  s.updatedAt = Date.now();
  notify();
}

export function getActiveTeam(): TeamActivation | null {
  return activeTeam;
}
export function setActiveTeam(team: TeamActivation | null) {
  activeTeam = team;
  notify();
}

export function resetSkills() {
  skills = seedSkills();
  activeTeam = null;
  notify();
}