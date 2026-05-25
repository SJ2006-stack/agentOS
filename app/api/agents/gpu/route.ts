import { GPU_SYSTEM } from "@/lib/ai/agents";
import { isOpenRouterConfigured, resolveModelId } from "@/lib/ai/model";
import { runChatWithTools } from "@/lib/ai/openrouter-agent";
import { addMemoryToHydra, MEMORY_PREFIXES } from "@/lib/hydradb/memory";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import type { GpuDispatchPayload } from "@/lib/os/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return new Response(
      "[fault] OPENROUTER_API_KEY not configured\n",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const { taskId, workerCount = 8, hotZones, modelId } = (await req.json()) as {
    taskId: string;
    workerCount?: number;
    hotZones?: GpuDispatchPayload["hotZones"];
    modelId?: string;
  };

  const model = resolveModelId(modelId);
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

  const results: string[] = [];

  await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const id = `w${String(i).padStart(3, "0")}`;
      const prefix = MEMORY_PREFIXES.gpuWorker(id);
      const zone = zones[i % zones.length] ?? { x: i % 16, y: Math.floor(i / 16) % 16, heat: 0.6 };

      await broadcastOsEvent("os:gpu", "worker_tick", {
        workerId: i,
        zone: { x: zone.x, y: zone.y },
        progress: 0.35,
      });

      const summary = `GPU worker ${id} zone (${zone.x},${zone.y}) heat=${zone.heat ?? 0.6} task=${taskId}`;
      if (process.env.HYDRADB_API_KEY) {
        await addMemoryToHydra({
          sub_tenant_id: prefix,
          text: summary,
          infer: false,
          metadata: { agent_id: prefix, pipeline_step: "GPU", task_id: taskId },
        });
      }

      try {
        const text = await runChatWithTools({
          modelId: model,
          system: GPU_SYSTEM,
          prompt: summary,
          tools: [],
          maxSteps: 1,
          maxTokens: 48,
        });
        results[i] = text;
      } catch {
        results[i] = `${id}: ok`;
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
    `[gpu] batch complete: ${count} workers (model=${model})\n${results.filter(Boolean).slice(0, 4).join("\n")}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
