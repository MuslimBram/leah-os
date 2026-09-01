import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateCodeRouted } from "../gen/codegen.server";
import { extractGeneratedFiles } from "../gen/generated-files";
import { commitGithubFiles, openGithubPullRequest } from "./ssot.server";

const Request = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
  branch: z.string().min(1).max(200),
  expectedHeadSha: z.string().regex(/^[0-9a-f]{40}$/i),
  baseBranch: z.string().min(1).max(200),
  commitMessage: z.string().min(1).max(500),
  pullRequest: z.object({
    title: z.string().min(1).max(256),
    body: z.string().max(20_000).optional(),
    draft: z.boolean().default(true),
  }).optional(),
  generation: z.object({
    kind: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    description: z.string().max(10_000).default(""),
    prompt: z.string().max(20_000).default(""),
    role: z.string().min(1).max(100).default("engineer"),
    routerMode: z.enum(["economy", "balanced", "quality"]).default("balanced"),
    byok: z.object({
      providerId: z.string().min(1).max(100),
      apiKey: z.string().max(20_000).optional(),
      baseUrl: z.string().url().optional(),
      model: z.string().max(200).optional(),
    }).nullish(),
  }),
  provenance: z.object({
    executionId: z.string().max(200).optional(),
    taskId: z.string().max(200).optional(),
  }).optional(),
});

export const githubGenerateCommitAndOpenPr = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Request.parse(input))
  .handler(async ({ data }) => {
    const generated = await generateCodeRouted(data.generation);
    const files = extractGeneratedFiles(generated.text);
    const commit = await commitGithubFiles({
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      expectedHeadSha: data.expectedHeadSha,
      message: data.commitMessage,
      files,
      provenance: {
        executionId: data.provenance?.executionId,
        taskId: data.provenance?.taskId,
        provider: generated.provider,
        model: generated.model,
      },
    });

    const pullRequest = data.pullRequest
      ? await openGithubPullRequest({
          owner: data.owner,
          repo: data.repo,
          headBranch: data.branch,
          expectedHeadSha: commit.commitSha,
          baseBranch: data.baseBranch,
          title: data.pullRequest.title,
          body: data.pullRequest.body,
          draft: data.pullRequest.draft,
        })
      : null;

    return {
      generation: {
        provider: generated.provider,
        model: generated.model,
        routerMode: generated.routerMode,
        attempts: generated.attempts,
        files: files.map((file) => ({ path: file.path, bytes: new TextEncoder().encode(file.content).byteLength })),
      },
      commit,
      pullRequest,
    };
  });
