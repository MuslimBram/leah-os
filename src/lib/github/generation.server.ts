import { generateCodeRouted, type RoutedCodeRequest } from "../gen/codegen.server";
import { extractGeneratedFiles } from "../gen/generated-files";
import {
  claimProviderMaterialization,
  finalizeProviderMaterialization,
} from "../providers/attempt-ledger.server";
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

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Pulse materialization response");
  }
  return value as Record<string, unknown>;
}

/**
 * Privileged internal pipeline. Do not expose this directly to a browser route.
 *
 * MR7A separates generation from side effects. A successful provider attempt is
 * marked canonical in Pulse first; then this function claims the logical request's
 * one materialization slot BEFORE any GitHub write. A retry that sees an existing
 * claim never creates another commit and must reconcile the recorded outcome.
 */
export async function generateCommitAndOpenPr(input: GenerateCommitRequest) {
  const authority = input.generation.authority;
  if (!authority?.taskId || !authority.leaseToken) {
    throw new Error("GitHub materialization requires server-derived task lease authority");
  }

  const generated = await generateCodeRouted(input.generation);
  const files = extractGeneratedFiles(generated.text);
  const materializationKey = `github:${generated.logicalRequestId}`;

  const claimResponse = await claimProviderMaterialization({
    ...authority,
    attemptId: generated.canonicalAttemptId,
    materializationKey,
  });
  const claim = objectValue(claimResponse.materialization);
  if (claim.idempotent_replay === true) {
    const status = typeof claim.status === "string" ? claim.status : "claimed";
    const ref = typeof claim.materialized_ref === "string" ? ` (${claim.materialized_ref})` : "";
    throw new Error(`GitHub materialization already ${status}${ref}; reconciliation required, duplicate commit blocked`);
  }

  const commit = await commitGithubFiles({
    owner: input.owner,
    repo: input.repo,
    branch: input.branch,
    expectedHeadSha: input.expectedHeadSha,
    message: input.commitMessage,
    files,
    provenance: {
      executionId: input.provenance?.executionId,
      taskId: input.provenance?.taskId ?? authority.taskId,
      provider: generated.provider,
      model: generated.model,
    },
  });

  // The Git commit itself is the durable external side effect. Record it before
  // attempting PR creation so a later PR failure cannot cause a retry to re-commit.
  await finalizeProviderMaterialization({
    ...authority,
    attemptId: generated.canonicalAttemptId,
    materializationKey,
    materializedRef: `github:commit:${commit.commitSha}`,
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
      logicalRequestId: generated.logicalRequestId,
      canonicalAttemptId: generated.canonicalAttemptId,
      billingMode: generated.billingMode,
      provider: generated.provider,
      model: generated.model,
      providerRequestId: generated.providerRequestId,
      usage: generated.usage,
      routerMode: generated.routerMode,
      attempts: generated.attempts,
      files: files.map((file) => ({ path: file.path, bytes: new TextEncoder().encode(file.content).byteLength })),
    },
    materialization: {
      key: materializationKey,
      ref: `github:commit:${commit.commitSha}`,
    },
    commit,
    pullRequest,
  };
}
