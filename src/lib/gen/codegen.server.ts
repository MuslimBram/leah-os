import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";
import { routeProvider, type RouterCandidate, type RouterMode } from "../router/code-router";

export type RoutedCodeRequest = {
  kind: string;
  title: string;
  description?: string;
  prompt?: string;
  role?: string;
  routerMode?: RouterMode;
  byok?: {
    providerId: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  } | null;
};

const SYSTEM = `Ti je një inxhinier softuerësh brenda LEAH AI OS.
Prodho GJITHMONË kod real dhe të plotë, jo përshkrime abstrakte.
Rregullat:
- Kthe 1-3 file konkretë, secili në një bllok kodi me tri backtick.
- Përpara çdo blloku shkruaj rrugën e file-it, p.sh. **src/routes/api/users.ts**.
- Kodi duhet të jetë i ekzekutueshëm, pa "TODO" të zbrazëta.
- Në fund shto 2-4 rreshta shënime të shkurtra në shqip.`;

function userPrompt(input: RoutedCodeRequest): string {
  return `Roli: ${input.role ?? "engineer"}
Kategoria e detyrës: ${input.kind}
Detyra: ${input.title}
Detaje: ${input.description ?? ""}

Kontekst i projektit:
${(input.prompt ?? "").slice(0, 12000)}

Prodho implementimin real tani.`;
}

export async function generateCodeRouted(input: RoutedCodeRequest) {
  const messages = [{ role: "user" as const, content: userPrompt(input) }];
  const candidates: RouterCandidate<string>[] = [];

  if (input.byok?.baseUrl) {
    const provider = createOpenAICompatible({
      name: input.byok.providerId,
      baseURL: input.byok.baseUrl,
      headers: input.byok.apiKey ? { Authorization: `Bearer ${input.byok.apiKey}` } : {},
    });
    const model = input.byok.model || "gpt-4o-mini";
    candidates.push({
      providerId: input.byok.providerId,
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

  const routed = await routeProvider({ capability: "code", mode: input.routerMode ?? "balanced", candidates });
  return {
    text: routed.value,
    provider: routed.providerId,
    model: routed.model,
    mock: false as const,
    routerMode: input.routerMode ?? "balanced",
    attempts: routed.attempts.map(({ providerId, model, ok, latencyMs }) => ({ providerId, model, ok, latencyMs })),
  };
}
