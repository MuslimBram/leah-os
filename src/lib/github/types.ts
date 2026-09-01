export type GithubRepoSnapshot = {
  owner: string;
  repo: string;
  private: boolean;
  defaultBranch: string;
  headSha: string;
  htmlUrl: string;
};

export type GithubGeneratedFile = {
  path: string;
  content: string;
};

export type GithubCommitProvenance = {
  executionId?: string;
  taskId?: string;
  provider?: string;
  model?: string;
};

export type GithubCommitResult = {
  branch: string;
  previousHeadSha: string;
  commitSha: string;
  treeSha: string;
  htmlUrl: string;
};

export type GithubPullRequestResult = {
  number: number;
  htmlUrl: string;
  headSha: string;
  baseBranch: string;
  draft: boolean;
};

export type GithubReleaseGate = {
  pass: boolean;
  reason: string;
  pullRequest: {
    number: number;
    state: string;
    draft: boolean;
    headSha: string;
    baseSha: string;
    mergeable: boolean | null;
  };
  checks: {
    total: number;
    pending: number;
    failed: string[];
    passed: string[];
  };
  statuses: {
    total: number;
    state: string;
    failed: string[];
  };
  approvals: number;
};

export type GithubMergeResult = {
  merged: boolean;
  sha: string | null;
  message: string;
};
