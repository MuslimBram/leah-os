// Deployment layer types — target-agnostic. Provider success is only recorded
// from a real provider response + health check, never from a generated URL.

export type DeployEnv = "preview" | "staging" | "production";

export type DeployStageId =
  | "build"
  | "test"
  | "database"
  | "deploy"
  | "healthcheck";

export type DeployReadiness = "server-adapter" | "planned";

export type DeployTarget = {
  id: string;
  name: string;
  vendor: string;
  /** Does the target support a database deployment in the certified adapter? */
  database: boolean;
  regions: string[];
  accent: string;
  description: string;
  readiness: DeployReadiness;
};

export type DeployStage = {
  id: DeployStageId;
  title: string;
  kind: string;
  description: string;
};

export type DeployStatus = "queued" | "running" | "succeeded" | "failed";

export type Deployment = {
  id: string;
  projectId?: string;
  projectName: string;
  targetId: string;
  env: DeployEnv;
  region: string;
  withDatabase: boolean;
  status: DeployStatus;
  executionId: string;
  /** Provider-returned URL only. null until the provider really returns one. */
  url: string | null;
  providerDeploymentId?: string;
  sourceSha?: string;
  providerState?: string;
  healthCheckedAt?: number;
  error?: string;
  createdAt: number;
  finishedAt?: number;
};
