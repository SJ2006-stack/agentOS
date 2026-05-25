import "server-only";
import type { LlmUsage } from "@/lib/ai/llm-types";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";

export type UsageTickPayload = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  agentId?: string;
  model?: string;
};

export function usageFromChunk(usage: LlmUsage | undefined): UsageTickPayload | null {
  if (!usage) return null;
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.reasoningTokens,
  };
}

export function formatUsageLine(payload: UsageTickPayload): string {
  let line = `[usage] tokens: prompt=${payload.promptTokens} completion=${payload.completionTokens}`;
  if (payload.reasoningTokens != null && payload.reasoningTokens > 0) {
    line += ` reasoning=${payload.reasoningTokens}`;
  }
  return `${line}\n`;
}

export async function emitUsageFeedback(
  usage: LlmUsage | undefined,
  options?: { write?: (chunk: string) => void; agentId?: string; model?: string }
): Promise<void> {
  const payload = usageFromChunk(usage);
  if (!payload) return;
  if (options?.agentId) payload.agentId = options.agentId;
  if (options?.model) payload.model = options.model;

  options?.write?.(formatUsageLine(payload));
  await broadcastOsEvent("os:kernel", "usage_tick", payload);
}
