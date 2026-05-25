export type OpenRouterModelEntry = {
  id: string;
  label: string;
};

/** Single OpenRouter auto-routing free model for DevFactory OS. */
export const OPENROUTER_MODELS: OpenRouterModelEntry[] = [
  { id: "openrouter/free", label: "OpenRouter Free" },
];

export const DEFAULT_MODEL_ID = "openrouter/free";

export const ALLOWED_MODEL_IDS = new Set(OPENROUTER_MODELS.map((m) => m.id));
