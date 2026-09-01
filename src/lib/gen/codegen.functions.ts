import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GenInput = z.object({
  kind: z.string(),
  title: z.string(),
  description: z.string().default(""),
  prompt: z.string().default(""),
  role: z.string().default("engineer"),
  routerMode: z.enum(["economy", "balanced", "quality"]).default("balanced"),
});

/**
 * Browser-callable generation is deliberately fail-closed in MR7A.
 *
 * The real primitive lives in codegen.server.ts and must only be exposed after
 * the Pulse -> LEAH session/workspace/RBAC binding can derive the workspace and
 * funding mode server-side. This prevents unauthenticated managed spend and
 * prevents a browser from supplying credentials, base URLs, usage, or cost.
 */
export const generateCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenInput.parse(input))
  .handler(async () => {
    throw new Error("Managed generation requires an authenticated Pulse/LEAH workspace session");
  });
