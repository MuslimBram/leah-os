import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyGithubMigrationToSupabase } from "./supabase.server";

const SupabaseMigrationInput = z.object({
  projectRef: z.string().regex(/^[a-z0-9]{20}$/),
  githubOwner: z.string().min(1).max(100),
  githubRepo: z.string().min(1).max(100),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i),
  migrationPath: z.string().min(1).max(500),
  expectedContentHash: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  allowDestructive: z.boolean().default(false),
});

export const supabaseApplyGithubMigration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SupabaseMigrationInput.parse(input))
  .handler(({ data }) => applyGithubMigrationToSupabase(data));
