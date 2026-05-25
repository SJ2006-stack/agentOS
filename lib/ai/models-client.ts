/** Client-safe re-exports — keep in sync with lib/ai/models.ts GEMINI_MODELS. */

export {
  GEMINI_MODELS,
  DEFAULT_MODEL_ID as DEFAULT_GEMINI_MODEL_ID,
  type GeminiModelEntry as GeminiModel,
} from "@/lib/ai/models";

import { ALLOWED_MODEL_IDS, GEMINI_MODELS } from "@/lib/ai/models";

export function isGeminiModelId(id: string): boolean {
  return ALLOWED_MODEL_IDS.has(id);
}

export function geminiModelById(id: string) {
  return GEMINI_MODELS.find((m) => m.id === id);
}
