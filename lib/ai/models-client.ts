/** Client-safe re-exports — keep in sync with lib/ai/models.ts OPENROUTER_MODELS. */

export {
  OPENROUTER_MODELS,
  DEFAULT_MODEL_ID as DEFAULT_OPENROUTER_MODEL_ID,
  type OpenRouterModelEntry as OpenRouterModel,
} from "@/lib/ai/models";

import { ALLOWED_MODEL_IDS, OPENROUTER_MODELS } from "@/lib/ai/models";

export function isOpenRouterModelId(id: string): boolean {
  return ALLOWED_MODEL_IDS.has(id);
}

export function openRouterModelById(id: string) {
  return OPENROUTER_MODELS.find((m) => m.id === id);
}
