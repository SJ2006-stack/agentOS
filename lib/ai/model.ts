import "server-only";
import { OpenRouter } from "@openrouter/sdk";
import { ALLOWED_MODEL_IDS, DEFAULT_MODEL_ID } from "@/lib/ai/models";

function openRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

/** True when OPENROUTER_API_KEY is set. */
export function isOpenRouterConfigured(): boolean {
  return Boolean(openRouterApiKey());
}

export function isAgentLlmConfigured(): boolean {
  return isOpenRouterConfigured();
}

let _openrouter: OpenRouter | null = null;

/** Singleton OpenRouter client (server-only). */
export function getOpenRouter(): OpenRouter {
  if (!_openrouter) {
    _openrouter = new OpenRouter({
      apiKey: openRouterApiKey() ?? "",
    });
  }
  return _openrouter;
}

export function resolveModelId(requested?: string): string {
  if (requested && ALLOWED_MODEL_IDS.has(requested)) {
    return requested;
  }
  return DEFAULT_MODEL_ID;
}

/** @deprecated Use getOpenRouter() — kept for transitional imports */
export function getModel(modelId: string): string {
  return resolveModelId(modelId);
}
