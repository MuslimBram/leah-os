// Free / low-cost OpenAI-compatible endpoints that the app can actually call.
// Everything here is BYOK except `pollinations`, which needs no key at all and
// is therefore the default fallback for real generation. Provider quotas and
// model availability can change; the UI must use the live Test Connection gate
// before treating an entry as certified.

export type FreeProvider = {
  id: string;
  name: string;
  vendor: string;
  /** OpenAI-compatible /chat/completions base URL. */
  baseUrl: string;
  models: string[];
  /** false = usable without any API key. */
  needsKey: boolean;
  free: string;
  signupUrl?: string;
  note?: string;
};

export const FREE_PROVIDERS: FreeProvider[] = [
  {
    id: "pollinations",
    name: "Pollinations",
    vendor: "Pollinations.AI",
    baseUrl: "https://text.pollinations.ai/openai",
    models: ["openai", "openai-large", "mistral", "qwen-coder"],
    needsKey: false,
    free: "Falas, pa çelës",
    note: "Fallback-u i parazgjedhur kur nuk ka asnjë çelës të konfiguruar; certifikoje me Test Connection para përdorimit kritik.",
  },
  {
    id: "kimi",
    name: "Kimi Code",
    vendor: "Moonshot AI / Kimi",
    baseUrl: "https://api.kimi.com/coding/v1",
    models: ["kimi-for-coding", "kimi-k2-thinking-turbo"],
    needsKey: true,
    free: "Kimi plan / API key",
    signupUrl: "https://www.kimi.com/",
    note: "Kimi Code API; disponueshmëria dhe kuota varen nga llogaria/plani.",
  },
  {
    id: "zai",
    name: "Z.ai (chat.z.ai)",
    vendor: "Z.ai / Zhipu",
    baseUrl: "https://api.z.ai/api/paas/v4",
    models: ["glm-4.6", "glm-4.5-air", "glm-4-flash"],
    needsKey: true,
    free: "API key / plan-dependent",
    signupUrl: "https://z.ai/manage-apikey/apikey-list",
    note: "Për GLM Coding Plan mund të nevojitet endpoint-i coding/paas/v4; përdor URL-në që jep llogaria jote.",
  },
  {
    id: "groq",
    name: "Groq",
    vendor: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "qwen/qwen3-32b", "moonshotai/kimi-k2-instruct"],
    needsKey: true,
    free: "Free tier me rate limit",
    signupUrl: "https://console.groq.com/keys",
  },
  {
    id: "openrouter",
    name: "OpenRouter (free models)",
    vendor: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "z-ai/glm-4.5-air:free",
      "deepseek/deepseek-chat-v3.1:free",
      "qwen/qwen3-coder:free",
      "moonshotai/kimi-k2:free",
    ],
    needsKey: true,
    free: "Modele :free kur ofrohen",
    signupUrl: "https://openrouter.ai/keys",
    note: "Modelet free ndryshojnë; Test Connection verifikon modelin e zgjedhur në kohën e përdorimit.",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    vendor: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    models: ["llama-3.3-70b", "qwen-3-coder-480b"],
    needsKey: true,
    free: "Free tier / quota-dependent",
    signupUrl: "https://cloud.cerebras.ai",
  },
  {
    id: "mistral-free",
    name: "Mistral (La Plateforme)",
    vendor: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    models: ["mistral-small-latest", "codestral-latest"],
    needsKey: true,
    free: "Experiment/quota-dependent",
    signupUrl: "https://console.mistral.ai/api-keys",
  },
  {
    id: "huggingface",
    name: "Hugging Face Router",
    vendor: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    models: ["Qwen/Qwen2.5-Coder-32B-Instruct", "meta-llama/Llama-3.3-70B-Instruct"],
    needsKey: true,
    free: "Kredite/kuota sipas llogarisë",
    signupUrl: "https://huggingface.co/settings/tokens",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    vendor: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:7b", "llama3.1:8b", "deepseek-coder-v2"],
    needsKey: false,
    free: "100% lokal, falas",
    note: "Duhet të jetë duke punuar në të njëjtën makinë ku ekzekutohet server runtime i Leah.",
  },
];

export function getFreeProvider(id: string) {
  return FREE_PROVIDERS.find((p) => p.id === id);
}
