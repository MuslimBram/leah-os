// Deployment layer types — target-agnostic. Adding a provider means adding a
// DeployTarget entry, never touching the engine.

export type DeployEnv = "preview" | "staging" | "production";

export type DeployStageId =
  | "build"
  | "test"
  | "database"
  | "deploy"
  | "healthcheck";

export type DeployTarget = {
  id: string;
  name: string;
  vendor: string;
  /** Does the target host a managed database alongside the app? */
  database: boolean;
  regions: string[];
  accent: string;
  description: string;
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
  url: string;
  createdAt: number;
  finishedAt?: number;
};