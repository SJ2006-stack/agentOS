import "server-only";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { getGeminiApiKey } from "@/lib/config/env";

/** True when GEMINI_API_KEY (or GOOGLE_API_KEY) is set and non-empty after trim. */
export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== undefined;
}

export function isAgentLlmConfigured(): boolean {
  return isGeminiConfigured();
}

/** Always resolves to the single allowed model: gemini-flash-latest. */
export function resolveModelId(requested?: string): string {
  void requested;
  return DEFAULT_MODEL_ID;
}
