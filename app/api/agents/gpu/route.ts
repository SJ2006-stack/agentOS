export const dynamic = "force-dynamic";

import { getGeminiKeyFault } from "@/lib/config/deploy-hint";
import { agentNeedsLlm } from "@/lib/ai/agent-llm-policy";
import { GPU_SYSTEM } from "@/lib/ai/agents";
import { isGeminiConfigured, resolveModelId } from "@/lib/ai/model";
import { runChatWithTools } from "@/lib/ai/gemini-agent";
import { emitUsageFeedback } from "@/lib/ai/usage-feedback";
import { writeAgentMemory } from "@/lib/hydradb/memory";
import { subTenantForGpuWorker } from "@/lib/os/agent-graph-data";
import { broadcastGraphNodeActive } from "@/lib/os/graph-broadcast";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import type { GpuDispatchPayload } from "@/lib/os/types";

export const maxDuration = 60;


export async function POST(req: Request) {
  if (!isGeminiConfigured()) {
    return new Response(getGeminiKeyFault(), {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { taskId, workerCount = 8, hotZones, modelId } = (await req.json()) as {
    taskId: string;
    workerCount?: number;
    hotZones?: GpuDispatchPayload["hotZones"];
    modelId?: string;
  };

  const model = resolveModelId(modelId);
  const useLlm = agentNeedsLlm("gpu.worker", "spawn");
  const count = Math.min(workerCount, 32);
  const zones =
    hotZones?.length
      ? hotZones
      : Array.from({ length: Math.min(count, 12) }, (_, i) => ({
          x: (i * 3) % 16,
          y: (i * 2) % 16,
          heat: 0.5 + (i % 5) * 0.1,
        }));

  if (!hotZones?.length) {
    await broadcastOsEvent("os:gpu", "dispatch", {
      hotZones: zones,
      activeWorkers: count,
      taskId,
    });
  }

  await broadcastGraphNodeActive({ nodeId: "gpu.worker", taskId });

  const results: string[] = [];

  await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const id = `w${String(i).padStart(3, "0")}`;
      const workerSub = subTenantForGpuWorker(id);
      const zone = zones[i % zones.length] ?? { x: i % 16, y: Math.floor(i / 16) % 16, heat: 0.6 };

      await broadcastOsEvent("os:gpu", "worker_tick", {
        workerId: i,
        zone: { x: zone.x, y: zone.y },
        progress: 0.35,
      });

      const summary = `GPU worker ${id} zone (${zone.x},${zone.y}) heat=${zone.heat ?? 0.6} task=${taskId}`;
      if (process.env.HYDRADB_API_KEY) {
        await writeAgentMemory("gpu.worker", summary, {
          agent_template: "gpu.worker",
          pipeline_step: "GPU",
          task_id: taskId,
          worker_id: id,
          sub_tenant_override: workerSub,
        });
      }

      if (useLlm) {
        try {
          const { text } = await runChatWithTools({
            modelId: model,
            system: GPU_SYSTEM,
            prompt: summary,
            tools: [],
            maxSteps: 1,
            maxTokens: 48,
            onUsage: (u) =>
              emitUsageFeedback(u, { agentId: `gpu.worker.${id}`, model }),
          });
          results[i] = text;
        } catch {
          results[i] = `${id}: ok`;
        }
      } else {
        results[i] = `${id}: zone (${zone.x},${zone.y}) batch ok`;
      }

      await broadcastOsEvent("os:gpu", "worker_tick", {
        workerId: i,
        zone: { x: zone.x, y: zone.y },
        progress: 1,
      });
    })
  );

  await broadcastOsEvent("os:gpu", "batch_complete", {
    taskId,
    workersCompleted: count,
  });

  return new Response(
    `[gpu] batch complete: ${count} workers (${useLlm ? `model=${model}` : "no LLM"})\n${results.filter(Boolean).slice(0, 4).join("\n")}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
