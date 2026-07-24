// Integration Layer — plugin contract.
// Anything that plugs into Leah (code-gen platforms, MiniApp frameworks,
// automation runners, deploy targets, memory backends...) implements this.
// The core never imports concrete plugins directly; it only talks to the
// registry via these types.

import type { ComponentType } from "react";

export type IntegrationCategory =
  | "code-generation"
  | "miniapp-framework"
  | "automation"
  | "worker-node"
  | "builder"
  | "deployment"
  | "memory"
  | "research"
  | "other";

export type IntegrationCapability =
  | "plan"
  | "generate-code"
  | "refactor"
  | "debug"
  | "run-workflow"
  | "deploy"
  | "scrape"
  | "embed"
  | "chat";

export type IntegrationStatus = "stable" | "beta" | "experimental" | "planned";

export type IntegrationConfigField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
  help?: string;
};

export type IntegrationRuntimeContext = {
  // Values captured from the user (API key, base URL, ...).
  config: Record<string, string>;
};

export type IntegrationInvokeInput = {
  capability: IntegrationCapability;
  payload: unknown;
};

export type IntegrationInvokeResult = {
  ok: boolean;
  data?: unknown;
  message?: string;
};

export type IntegrationPlugin = {
  id: string;
  name: string;
  vendor: string;
  category: IntegrationCategory;
  capabilities: IntegrationCapability[];
  status: IntegrationStatus;
  description: string;
  docsUrl?: string;
  /** Fields the user must fill in for BYOK / self-host. Empty means no config. */
  configSchema?: IntegrationConfigField[];
  /** Whether the plugin ships enabled by default. */
  defaultEnabled?: boolean;
  /** Optional icon component. */
  Icon?: ComponentType<{ className?: string }>;
  /** Optional accent color token (oklch/hex). */
  accent?: string;
  /**
   * Optional invoke handler. Kept optional so plugins can be pure metadata
   * (planned / third-party managed) without breaking the registry.
   */
  invoke?: (
    input: IntegrationInvokeInput,
    ctx: IntegrationRuntimeContext,
  ) => Promise<IntegrationInvokeResult>;
};