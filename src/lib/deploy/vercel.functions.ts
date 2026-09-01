import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deployExactGithubShaToVercel } from "./vercel.server";

const VercelDeployInput = z.object({
  project: z.string().min(1).max(100),
  githubOwner: z.string().min(1).max(100),
  githubRepo: z.string().min(1).max(100),
  branch: z.string().min(1).max(200),
  expectedSha: z.string().regex(/^[0-9a-f]{40}$/i),
  target: z.enum(["preview", "production"]).default("preview"),
  teamId: z.string().min(1).max(100).optional(),
  healthPath: z.string().min(1).max(500).default("/"),
  timeoutMs: z.number().int().min(10_000).max(600_000).optional(),
});

export const vercelDeployExactSha = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VercelDeployInput.parse(input))
  .handler(({ data }) => deployExactGithubShaToVercel(data));
