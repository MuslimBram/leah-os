import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { generateCodeRouted } from "./codegen.server";

const GenInput = z.object({
  kind: z.string(),
  title: z.string(),
  description: z.string().default(""),
  prompt: z.string().default(""),
  role: z.string().default("engineer"),
  routerMode: z.enum(["economy", "balanced", "quality"]).default("balanced"),
  byok: z.object({
    providerId: z.string(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string().optional(),
  }).nullish(),
});

const ProviderTestInput = z.object({
  providerId: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url(),
  model: z.string().min(1),
});

function openAiCompatibleProvider(input: z.infer<typeof ProviderTestInput>) {
  return createOpenAICompatible({
    name: input.providerId,
    baseURL: input.baseUrl,
    headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
  });
}

export const testCodeProvider = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ProviderTestInput.parse(input))
  .handler(async ({ data }) => {
    const startedAt = Date.now();
    const provider = openAiCompatibleProvider(data);
    const result = streamText({
      model: provider(data.model),
      system: "Connection test. Reply with exactly LEAH_OK and nothing else.",
      messages: [{ role: "user" as const, content: "ping" }],
    });
    const text = (await result.text).trim();
    if (!text) throw new Error("Provider returned an empty response");
    return { ok: true, provider: data.providerId, model: data.model, latencyMs: Date.now() - startedAt, sample: text.slice(0, 120) };
  });

export const generateCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenInput.parse(input))
  .handler(({ data }) => generateCodeRouted(data));
