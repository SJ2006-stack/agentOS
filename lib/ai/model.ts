import "server-only";
import { createGateway } from "@ai-sdk/gateway";
import { ALLOWED_MODEL_IDS, DEFAULT_MODEL_ID } from "@/lib/ai/models";

function gatewayApiKey(): string | undefined {
  return (
    process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY
  );
}

/** True when a Vercel AI Gateway API key is set (either env name). */
export function isAiGatewayConfigured(): boolean {
  return Boolean(gatewayApiKey());
}

/** Migration helper: gateway key preferred; OPENAI_API_KEY still accepted for env checks only. */
export function isAgentLlmConfigured(): boolean {
  return isAiGatewayConfigured() || Boolean(process.env.OPENAI_API_KEY);
}

const gateway = createGateway({
  apiKey: gatewayApiKey() ?? "",
});

export function resolveModelId(requested?: string): string {
  if (requested && ALLOWED_MODEL_IDS.has(requested)) {
    return requested;
  }
  return DEFAULT_MODEL_ID;
}

export function getModel(modelId: string) {
  return gateway(resolveModelId(modelId));
}
