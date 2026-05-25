export type OpenRouterModelEntry = {
  id: string;
  label: string;
  provider: string;
  /** Shown in UI — OpenRouter :free tier models */
  free?: boolean;
};

/** Curated OpenRouter models for DevFactory OS agents and UI. */
export const OPENROUTER_MODELS: OpenRouterModelEntry[] = [
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B",
    provider: "google",
    free: true,
  },
  {
    id: "google/gemini-2.0-flash-001:free",
    label: "Gemini 2.0 Flash",
    provider: "google",
    free: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
    provider: "meta",
    free: true,
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    label: "Qwen 2.5 72B",
    provider: "qwen",
    free: true,
  },
  {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1",
    provider: "deepseek",
    free: true,
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    label: "Mistral 7B",
    provider: "mistral",
    free: true,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "openai",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
    provider: "anthropic",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
  },
];

export const DEFAULT_MODEL_ID = "google/gemma-4-26b-a4b-it:free";

/** @deprecated Use DEFAULT_MODEL_ID — kept for existing imports */
export const MODEL_ID = DEFAULT_MODEL_ID;

export const ALLOWED_MODEL_IDS = new Set(OPENROUTER_MODELS.map((m) => m.id));
