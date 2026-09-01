import { extractGeneratedFiles } from "./generated-files";
import { callConfiguredManagedProvider, validateProviderText, type ProviderTextResult } from "../providers/client.server";
import { listConfiguredManagedProviders } from "../providers/registry.server";
import { routeProvider, type BillingMode, type RouterCandidate, type RouterMode } from "../router/code-router";

export type RoutedCodeRequest = {
  kind: string;
  title: string;
  description?: string;
  prompt?: string;
  role?: string;
  routerMode?: RouterMode;
  billingMode?: BillingMode;
  logicalRequestId?: string;
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

function roughTokenEstimate(text: string): number {
  // Conservative pre-flight estimate only. Provider-reported usage remains authoritative after the call.
  return Math.max(1, Math.ceil(text.length / 3));
}

function providerOrder(): string[] {
  return (process.env["LEAH_MANAGED_PROVIDER_ORDER"] ?? "openai,anthropic,gemini,deepseek,kimi,zai")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function managedCandidates(messages: { system: string; user: string }): RouterCandidate<ProviderTextResult>[] {
  const configured = listConfiguredManagedProviders();
  const order = providerOrder();
  return configured.map(({ entry, model }) => {
    const index = order.indexOf(entry.id);
    const orderRank = index < 0 ? order.length : index;
    return {
      providerId: entry.id,
      model,
      billingMode: "managed" as const,
      capabilities: ["code", "reasoning", "chat"] as const,
      costRank: 1,
      qualityRank: Math.max(1, 100 - orderRank * 5),
      run: () => callConfiguredManagedProvider(entry.id, messages),
      validate: (value: ProviderTextResult) => {
        if (!validateProviderText(value)) return false;
        try {
          extractGeneratedFiles(value.text);
          return true;
        } catch {
          return false;
        }
      },
    };
  });
}

/**
 * Privileged server-internal generation primitive.
 *
 * BYOK is deliberately fail-closed here until the Pulse Vault/session binding
 * supplies a workspace-authoritative credential. Browser/localStorage keys are
 * not accepted by MR7A and a BYOK request never falls back to managed spend.
 */
export async function generateCodeRouted(input: RoutedCodeRequest) {
  const billingMode = input.billingMode ?? "managed";
  if (billingMode === "byok") {
    throw new Error("BYOK generation requires a Pulse Vault-bound workspace credential");
  }

  const messages = { system: SYSTEM, user: userPrompt(input) };
  const candidates = managedCandidates(messages);
  if (candidates.length === 0) {
    throw new Error("No MR7A managed provider is configured server-side");
  }

  const estimatedInputTokens = roughTokenEstimate(`${SYSTEM}\n${messages.user}`);
  const routed = await routeProvider({
    capability: "code",
    billingMode,
    mode: input.routerMode ?? "balanced",
    logicalRequestId: input.logicalRequestId,
    estimatedInputTokens,
    candidates,
  });

  return {
    text: routed.value.text,
    provider: routed.providerId,
    model: routed.model,
    billingMode: routed.billingMode,
    logicalRequestId: routed.logicalRequestId,
    providerRequestId: routed.value.providerRequestId,
    usage: routed.value.usage,
    mock: false as const,
    routerMode: input.routerMode ?? "balanced",
    attempts: routed.attempts,
  };
}
