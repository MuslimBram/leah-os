import { generateCodeRouted, type RoutedCodeRequest } from "../gen/codegen.server";
import { extractGeneratedFiles } from "../gen/generated-files";
import { commitGithubFiles, openGithubPullRequest } from "./ssot.server";

export type GenerateCommitRequest = {
  owner: string;
  repo: string;
  branch: string;
  expectedHeadSha: string;
  baseBranch: string;
  commitMessage: string;
  pullRequest?: {
    title: string;
    body?: string;
    draft?: boolean;
  };
  generation: RoutedCodeRequest;
  provenance?: {
    executionId?: string;
    taskId?: string;
  };
};

/**
 * Privileged internal pipeline. Do not expose this directly to a browser route.
 * Macro-Run 5 must bind its caller to Pulse session/workspace/RBAC before a public
 * server-function wrapper is created.
 */
export async function generateCommitAndOpenPr(input: GenerateCommitRequest) {
  const generated = await generateCodeRouted(input.generation);
  const files = extractGeneratedFiles(generated.text);
  const commit = await commitGithubFiles({
    owner: input.owner,
    repo: input.repo,
    branch: input.branch,
    expectedHeadSha: input.expectedHeadSha,
    message: input.commitMessage,
    files,
    provenance: {
      executionId: input.provenance?.executionId,
      taskId: input.provenance?.taskId,
      provider: generated.provider,
      model: generated.model,
    },
  });

  const pullRequest = input.pullRequest
    ? await openGithubPullRequest({
        owner: input.owner,
        repo: input.repo,
        headBranch: input.branch,
        expectedHeadSha: commit.commitSha,
        baseBranch: input.baseBranch,
        title: input.pullRequest.title,
        body: input.pullRequest.body,
        draft: input.pullRequest.draft ?? true,
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
}
