/** Client-safe re-exports — keep in sync with lib/ai/models.ts GATEWAY_MODELS. */

export {
  GATEWAY_MODELS,
  DEFAULT_MODEL_ID as DEFAULT_GATEWAY_MODEL_ID,
  type GatewayModelEntry as GatewayModel,
} from "@/lib/ai/models";

import { ALLOWED_MODEL_IDS, GATEWAY_MODELS } from "@/lib/ai/models";

export function isGatewayModelId(id: string): boolean {
  return ALLOWED_MODEL_IDS.has(id);
}

export function gatewayModelById(id: string) {
  return GATEWAY_MODELS.find((m) => m.id === id);
}
