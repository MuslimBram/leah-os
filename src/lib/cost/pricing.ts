// Sprint 5 — Cost model. Prices are USD per 1M tokens (indicative list
// prices; BYOK users can override at runtime via `setPricing`).

export type Pricing = { input: number; output: number; contextTokens: number };

const DEFAULT_PRICING: Record<string, Pricing> = {
  claude:     { input: 3.00,  output: 15.00, contextTokens: 200_000 },
  gpt:        { input: 0.60,  output: 2.40,  contextTokens: 400_000 },
  gemini:     { input: 0.10,  output: 0.40,  contextTokens: 1_000_000 },
  codex:      { input: 1.50,  output: 6.00,  contextTokens: 200_000 },
  cursor:     { input: 1.00,  output: 4.00,  contextTokens: 128_000 },
  windsurf:   { input: 0.90,  output: 3.60,  contextTokens: 128_000 },
  lovable:    { input: 1.20,  output: 4.80,  contextTokens: 200_000 },
  perplexity: { input: 0.50,  output: 2.00,  contextTokens: 128_000 },
  firecrawl:  { input: 0.20,  output: 0.60,  contextTokens: 64_000 },
  deepseek:   { input: 0.14,  output: 0.28,  contextTokens: 128_000 },
  grok:       { input: 2.00,  output: 10.00, contextTokens: 256_000 },
  mistral:    { input: 0.25,  output: 0.75,  contextTokens: 128_000 },
  llama:      { input: 0.05,  output: 0.10,  contextTokens: 128_000 },
  qwen:       { input: 0.20,  output: 0.60,  contextTokens: 256_000 },
  kimi:       { input: 0.15,  output: 2.50,  contextTokens: 256_000 },
  glm:        { input: 0.40,  output: 1.75,  contextTokens: 200_000 },
  minimax:    { input: 0.30,  output: 1.20,  contextTokens: 200_000 },
  bolt:       { input: 1.00,  output: 4.00,  contextTokens: 128_000 },
  v0:         { input: 1.00,  output: 4.00,  contextTokens: 128_000 },
  replit:     { input: 1.20,  output: 4.50,  contextTokens: 128_000 },
  devin:      { input: 4.00,  output: 16.00, contextTokens: 200_000 },
  antigravity:{ input: 0.80,  output: 3.20,  contextTokens: 1_000_000 },
  base44:     { input: 1.00,  output: 3.50,  contextTokens: 128_000 },
  emergent:   { input: 0.90,  output: 3.20,  contextTokens: 128_000 },
};

const overrides: Record<string, Pricing> = {};

export function setPricing(providerId: string, pricing: Pricing) {
  overrides[providerId] = pricing;
}

export function getPricing(providerId: string): Pricing {
  return overrides[providerId] ?? DEFAULT_PRICING[providerId] ?? { input: 1, output: 3, contextTokens: 128_000 };
}

export function listPricing(): Record<string, Pricing> {
  return { ...DEFAULT_PRICING, ...overrides };
}

/** Rough token estimate — ~4 chars per token, good enough for routing. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/** USD cost for a given provider and token split. */
export function estimateCost(providerId: string, inputTokens: number, outputTokens: number): number {
  const p = getPricing(providerId);
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}