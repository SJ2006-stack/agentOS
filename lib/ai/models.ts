export type GatewayModelEntry = {
  id: string;
  label: string;
  provider: string;
};

/** Curated gateway models for DevFactory OS agents and UI. */
export const GATEWAY_MODELS: GatewayModelEntry[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "openai" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", provider: "openai" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", provider: "anthropic" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4", provider: "anthropic" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", provider: "google" },
  { id: "deepseek/deepseek-v3", label: "DeepSeek V3", provider: "deepseek" },
  { id: "meta/llama-3.3-70b", label: "Llama 3.3 70B", provider: "meta" },
];

export const DEFAULT_MODEL_ID = "openai/gpt-4o-mini";

/** @deprecated Use DEFAULT_MODEL_ID — kept for existing imports */
export const MODEL_ID = DEFAULT_MODEL_ID;

export const ALLOWED_MODEL_IDS = new Set(GATEWAY_MODELS.map((m) => m.id));
