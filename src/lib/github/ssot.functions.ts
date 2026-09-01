import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  commitGithubFiles,
  createGithubTaskBranch,
  inspectGithubReleaseGate,
  mergeGithubPullRequest,
  openGithubPullRequest,
  readGithubRepo,
} from "./ssot.server";

const RepoInput = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
});

const Sha = z.string().regex(/^[0-9a-f]{40}$/i);
const Branch = z.string().min(1).max(200);

export const githubRepoSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.parse(input))
  .handler(({ data }) => readGithubRepo(data.owner, data.repo));

export const githubCreateTaskBranch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.extend({ branch: Branch, baseSha: Sha }).parse(input))
  .handler(({ data }) => createGithubTaskBranch(data));

export const githubCommitGeneratedFiles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.extend({
    branch: Branch,
    expectedHeadSha: Sha,
    message: z.string().min(1).max(500),
    files: z.array(z.object({ path: z.string().min(1).max(500), content: z.string().max(1_000_000) })).min(1).max(100),
    provenance: z.object({
      executionId: z.string().max(200).optional(),
      taskId: z.string().max(200).optional(),
      provider: z.string().max(100).optional(),
      model: z.string().max(200).optional(),
    }).optional(),
  }).parse(input))
  .handler(({ data }) => commitGithubFiles(data));

export const githubOpenPullRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.extend({
    headBranch: Branch,
    expectedHeadSha: Sha,
    baseBranch: Branch,
    title: z.string().min(1).max(256),
    body: z.string().max(20_000).optional(),
    draft: z.boolean().optional(),
  }).parse(input))
  .handler(({ data }) => openGithubPullRequest(data));

export const githubReleaseGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.extend({
    pullNumber: z.number().int().positive(),
    expectedHeadSha: Sha,
    requireApproval: z.boolean().optional(),
  }).parse(input))
  .handler(({ data }) => inspectGithubReleaseGate(data));

export const githubGuardedMerge = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RepoInput.extend({
    pullNumber: z.number().int().positive(),
    expectedHeadSha: Sha,
    requireApproval: z.boolean().optional(),
    method: z.enum(["merge", "squash", "rebase"]).optional(),
  }).parse(input))
  .handler(({ data }) => mergeGithubPullRequest(data));
