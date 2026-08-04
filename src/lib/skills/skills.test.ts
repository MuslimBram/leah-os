// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { seedAgents } from "@/lib/agents/agents.seed";
import { getAgent } from "@/lib/agents/registry";
import {
  addLesson, getSkill, grantXp, installSkill, installedSkills,
  listSkills, resetSkills, uninstallSkill,
} from "./store";
import { augmentPrompt, learnFromResult, matchSkills } from "./engine";
import { activateTeam, activeTeamId, deactivateTeam } from "./teams";

beforeEach(() => {
  resetSkills();
  seedAgents();
});

describe("skill store", () => {
  it("seeds a catalog with nothing installed", () => {
    expect(listSkills().length).toBeGreaterThanOrEqual(8);
    expect(installedSkills().length).toBe(0);
  });

  it("installs and uninstalls", () => {
    installSkill("react");
    expect(installedSkills().map((s) => s.id)).toContain("react");
    uninstallSkill("react");
    expect(installedSkills().length).toBe(0);
  });

  it("levels up when xp crosses the threshold", () => {
    installSkill("testing");
    grantXp("testing", 100);
    expect(getSkill("testing")?.level).toBe(2);
  });

  it("ignores duplicate lessons", () => {
    addLesson("docs", "shkruaj shembuj të ekzekutueshëm");
    addLesson("docs", "shkruaj shembuj të ekzekutueshëm");
    expect(getSkill("docs")?.lessons.length).toBe(1);
  });
});

describe("skills engine", () => {
  it("matches skills by task kind", () => {
    installSkill("react");
    expect(matchSkills("frontend").map((s) => s.id)).toContain("react");
    expect(matchSkills("deployment").length).toBe(0);
  });

  it("injects knowledge into the prompt only when relevant", () => {
    installSkill("supabase");
    expect(augmentPrompt("database", "base")).toContain("Supabase Expert");
    expect(augmentPrompt("frontend", "base")).toBe("base");
  });

  it("self-evolves from execution output", () => {
    installSkill("testing");
    learnFromResult({ kind: "testing", title: "E2E", output: "Mbulova rrjedhat kritike me Playwright." });
    const s = getSkill("testing")!;
    expect(s.xp).toBe(25);
    expect(s.lessons.length).toBe(1);
  });
});

describe("team activation", () => {
  it("repoints agent providers and restores them", () => {
    const before = getAgent("frontend-eng")!.providerId;
    activateTeam("startup");
    expect(activeTeamId()).toBe("startup");
    expect(getAgent("frontend-eng")!.providerId).toBe("cursor");
    deactivateTeam();
    expect(activeTeamId()).toBeNull();
    expect(getAgent("frontend-eng")!.providerId).toBe(before);
  });
});