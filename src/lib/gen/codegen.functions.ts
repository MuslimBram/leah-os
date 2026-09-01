import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";
import { routeProvider, type RouterCandidate } from "../router/code-router";

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

const SYSTEM = `Ti je një inxhinier softuerësh brenda LEAH AI OS.
Prodho GJITHMONË kod real dhe të plotë, jo përshkrime abstrakte.
Rregullat:
- Kthe 1-3 file konkretë, secili në një bllok kodi me tri backtick.
- Përpara çdo blloku shkruaj rrugën e file-it, p.sh. **src/routes/api/users.ts**.
- Kodi duhet të jetë i ekzekutueshëm, pa "TODO" të zbrazëta.
- Në fund shto 2-4 rreshta shënime të shkurtra në shqip.`;

function buildUserPrompt(d: z.infer<typeof GenInput>) {
  return `Roli: ${d.role}
Kategoria e detyrës: ${d.kind}
Detyra: ${d.title}
Detaje: ${d.description}

Kontekst i projektit:
${d.prompt.slice(0, 12000)}

Prodho implementimin real tani.`;
}

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
  .handler(async ({ data }) => {
    const messages = [{ role: "user" as const, content: buildUserPrompt(data) }];
    const candidates: RouterCandidate<string>[] = [];

    if (data.byok?.baseUrl) {
      const provider = createOpenAICompatible({
        name: data.byok.providerId,
        baseURL: data.byok.baseUrl,
        headers: data.byok.apiKey ? { Authorization: `Bearer ${data.byok.apiKey}` } : {},
      });
      const model = data.byok.model || "gpt-4o-mini";
      candidates.push({
        providerId: data.byok.providerId,
        model,
        capabilities: ["code", "chat"],
        costRank: 0,
        qualityRank: 90,
        run: async () => {
          const result = streamText({ model: provider(model), system: SYSTEM, messages });
          return await result.text;
        },
        validate: (text) => text.trim().length > 0,
      });
    }

    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (lovableKey) {
      const gateway = createLovableAiGatewayProvider(lovableKey);
      const model = "google/gemini-3.6-flash";
      candidates.push({
        providerId: "lovable-gateway",
        model,
        capabilities: ["code", "reasoning", "chat"],
        costRank: 2,
        qualityRank: 100,
        run: async () => {
          const result = streamText({ model: gateway(model), system: SYSTEM, messages });
          return await result.text;
        },
        validate: (text) => text.trim().length > 0,
      });
    }

    const pollinations = createOpenAICompatible({ name: "pollinations", baseURL: "https://text.pollinations.ai/openai" });
    candidates.push({
      providerId: "pollinations",
      model: "openai",
      capabilities: ["code", "chat"],
      costRank: 0,
      qualityRank: 60,
      run: async () => {
        const result = streamText({ model: pollinations("openai"), system: SYSTEM, messages });
        return await result.text;
      },
      validate: (text) => text.trim().length > 0,
    });

    const routed = await routeProvider({ capability: "code", mode: data.routerMode, candidates });
    return {
      text: routed.value,
      provider: routed.providerId,
      model: routed.model,
      mock: false,
      routerMode: data.routerMode,
      attempts: routed.attempts.map(({ providerId, model, ok, latencyMs }) => ({ providerId, model, ok, latencyMs })),
    };
  });
