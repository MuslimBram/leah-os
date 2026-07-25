// AI Provider abstraction. Any code-gen / chat model (Claude, GPT, Gemini,
// DeepSeek, Codex, Ollama, Antigravity…) plugs in through this interface.
// Callers depend on `AIProvider`, never on a concrete SDK.

import { emit } from "./event-bus";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export type AIRequest = {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type AIResponse = {
  text: string;
  model: string;
  usage?: { input?: number; output?: number };
};

export type AIProvider = {
  id: string;
  label: string;
  models: string[];
  /** Runs a chat/completion. Providers may be BYOK or managed. */
  complete: (req: AIRequest) => Promise<AIResponse>;
};

const providers = new Map<string, AIProvider>();

export function registerAIProvider(p: AIProvider) {
  providers.set(p.id, p);
}

export function getAIProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function listAIProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export async function runAI(providerId: string, req: AIRequest): Promise<AIResponse> {
  const p = providers.get(providerId);
  if (!p) throw new Error(`AI provider '${providerId}' not registered`);
  emit({ type: "ai.request", provider: p.id, model: req.model });
  try {
    const res = await p.complete(req);
    emit({ type: "ai.response", provider: p.id, model: req.model, ok: true });
    return res;
  } catch (err) {
    emit({ type: "ai.response", provider: p.id, model: req.model, ok: false });
    throw err;
  }
}