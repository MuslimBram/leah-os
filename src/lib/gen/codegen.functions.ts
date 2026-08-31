import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "../ai-gateway.server";

const GenInput = z.object({
  kind: z.string(),
  title: z.string(),
  description: z.string().default(""),
  prompt: z.string().default(""),
  role: z.string().default("engineer"),
  byok: z
    .object({
      providerId: z.string(),
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      model: z.string().optional(),
    })
    .nullish(),
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

/**
 * Live provider probe. A configured provider is not considered usable until
 * this call returns a non-empty model response from the exact endpoint/model.
 */
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
    return {
      ok: true,
      provider: data.providerId,
      model: data.model,
      latencyMs: Date.now() - startedAt,
      sample: text.slice(0, 120),
    };
  });

export const generateCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenInput.parse(input))
  .handler(async ({ data }) => {
    const messages = [{ role: "user" as const, content: buildUserPrompt(data) }];

    // 1) BYOK / free OpenAI-compatible endpoint, when the user configured one.
    if (data.byok?.baseUrl) {
      const provider = createOpenAICompatible({
        name: data.byok.providerId,
        baseURL: data.byok.baseUrl,
        headers: data.byok.apiKey ? { Authorization: `Bearer ${data.byok.apiKey}` } : {},
      });
      const model = data.byok.model || "gpt-4o-mini";
      const result = streamText({ model: provider(model), system: SYSTEM, messages });
      const text = await result.text;
      if (!text.trim()) throw new Error(`${data.byok.providerId}/${model} returned an empty response`);
      return { text, provider: data.byok.providerId, model, mock: false };
    }

    // 2) Managed Lovable AI Gateway.
    const key = process.env["LOVABLE_API_KEY"];
    if (key) {
      const gateway = createLovableAiGatewayProvider(key);
      const model = "google/gemini-3.6-flash";
      const result = streamText({ model: gateway(model), system: SYSTEM, messages });
      const text = await result.text;
      if (!text.trim()) throw new Error(`lovable-gateway/${model} returned an empty response`);
      return { text, provider: "lovable-gateway", model, mock: false };
    }

    // 3) Keyless public fallback. This is still a live network call, not a mock.
    const provider = createOpenAICompatible({
      name: "pollinations",
      baseURL: "https://text.pollinations.ai/openai",
    });
    const result = streamText({ model: provider("openai"), system: SYSTEM, messages });
    const text = await result.text;
    if (!text.trim()) throw new Error("pollinations/openai returned an empty response");
    return { text, provider: "pollinations", model: "openai", mock: false };
  });
