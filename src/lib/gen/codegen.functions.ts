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
      return { text, provider: data.byok.providerId, model, mock: false };
    }

    // 2) Managed Lovable AI Gateway.
    const key = process.env["LOVABLE_API_KEY"];
    if (key) {
      const gateway = createLovableAiGatewayProvider(key);
      const model = "google/gemini-3.6-flash";
      const result = streamText({ model: gateway(model), system: SYSTEM, messages });
      const text = await result.text;
      return { text, provider: "lovable-gateway", model, mock: false };
    }

    // 3) Keyless public fallback so "Generate" never produces nothing.
    const provider = createOpenAICompatible({
      name: "pollinations",
      baseURL: "https://text.pollinations.ai/openai",
    });
    const result = streamText({ model: provider("openai"), system: SYSTEM, messages });
    const text = await result.text;
    return { text, provider: "pollinations", model: "openai", mock: false };
  });