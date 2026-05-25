import "server-only";
import { OpenRouter } from "@openrouter/sdk";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { getOpenRouterApiKey } from "@/lib/env";

/** True when OPENROUTER_API_KEY (or OPENROUTER_KEY) is set and non-empty after trim. */
export function isOpenRouterConfigured(): boolean {
  return getOpenRouterApiKey() !== undefined;
}

export function isAgentLlmConfigured(): boolean {
  return isOpenRouterConfigured();
}

let _openrouter: OpenRouter | null = null;

/** Singleton OpenRouter client (server-only). */
export function getOpenRouter(): OpenRouter {
  if (!_openrouter) {
    _openrouter = new OpenRouter({
      apiKey: getOpenRouterApiKey() ?? "",
    });
  }
  return _openrouter;
}

/** Always resolves to the single allowed model: openrouter/free. */
export function resolveModelId(_requested?: string): string {
  return DEFAULT_MODEL_ID;
}

/** @deprecated Use getOpenRouter() — kept for transitional imports */
export function getModel(_modelId: string): string {
  return DEFAULT_MODEL_ID;
}
