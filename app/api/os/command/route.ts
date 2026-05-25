import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { isAgentLlmConfigured, resolveModelId } from "@/lib/ai/model";
import {
  incrementalStreamResponse,
  streamChatWithTools,
  textStreamResponse,
} from "@/lib/ai/openrouter-agent";
import { parseShellCommand } from "@/lib/os/types";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { isHydraConfigured } from "@/lib/hydradb/client";
import {
  formatMemoryStream,
  recallAllContext,
  recallPreferences,
} from "@/lib/hydradb/memory";
import { createTaskId } from "@/lib/os/pipeline";
import { runCpuPipeline } from "@/lib/ai/run-cpu";

export const maxDuration = 120;

function kernelStream(prompt: string, model: string, taskId?: string) {
  return streamChatWithTools({
    modelId: model,
    system: KERNEL_SYSTEM,
    prompt,
    tools: createKernelTools({ taskId }),
    maxSteps: 3,
  });
}

export async function POST(req: Request) {
  const { command, modelId: requestedModelId } = (await req.json()) as {
    command: string;
    modelId?: string;
  };
  const model = resolveModelId(requestedModelId);
  const parsed = parseShellCommand(command);

  void broadcastOsEvent("os:kernel", "command_routed", {
    command,
    route:
      parsed.type === "submit"
        ? "cpu"
        : parsed.type === "recall" ||
            parsed.type === "memory_stream" ||
            parsed.type === "show_memory"
          ? "hydradb"
          : parsed.type === "status"
            ? "status"
            : "kernel",
  });

  const needsHydra =
    parsed.type === "recall" ||
    parsed.type === "memory_stream" ||
    parsed.type === "show_memory";

  if (needsHydra && !isHydraConfigured()) {
    return new Response(
      "[fault] HYDRADB_API_KEY missing — copy .env.example to .env.local\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const needsLlm = parsed.type === "kill" || parsed.type === "unknown";

  if (needsLlm && !isAgentLlmConfigured()) {
    return new Response(
      "[fault] OPENROUTER_API_KEY missing — copy .env.example to .env.local\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  switch (parsed.type) {
    case "submit": {
      const taskId = createTaskId();
      const origin = new URL(req.url).origin;
      return incrementalStreamResponse(
        `[kernel] task queued: ${taskId}\n`,
        async (write) => {
          await runCpuPipeline(taskId, parsed.task, origin, model, write);
        }
      );
    }

    case "recall":
    case "memory_stream":
    case "show_memory": {
      const query =
        parsed.type === "show_memory"
          ? "recent system memory"
          : parsed.type === "memory_stream"
            ? parsed.query ?? "recent operational context"
            : parsed.query;

      const agg = await recallAllContext(query);
      const formatted = formatMemoryStream(agg.chunks, agg.queryPaths);
      return textStreamResponse(
        `${formatted}\n`,
        kernelStream(
          `User requested memory stream for: "${query}". Call stream_memory_to_user. Preloaded:\n${formatted}`,
          model,
          undefined
        )
      );
    }

    case "status": {
      const hydra = isHydraConfigured();
      const recent = hydra
        ? await recallPreferences({ query: "status", max_results: 3 })
        : { chunks: [], queryPaths: [] };
      const lines = [
        "[kernel] DevFactory OS status",
        `[kernel] HydraDB: ${hydra ? "connected" : "disconnected"}`,
        `[kernel] memory chunks: ${recent.chunks.length}`,
      ];
      return new Response(lines.join("\n") + "\n", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    case "spawn": {
      const taskId = createTaskId();
      const hotZones = Array.from({ length: Math.min(parsed.count, 12) }, (_, i) => ({
        x: (i * 3) % 16,
        y: (i * 2) % 16,
        heat: 0.5 + (i % 5) * 0.1,
      }));
      void broadcastOsEvent("os:gpu", "dispatch", {
        hotZones,
        activeWorkers: parsed.count,
        taskId,
      });
      const { invokeGpuAgents } = await import("@/lib/ai/run-cpu");
      void invokeGpuAgents({
        taskId,
        workerCount: parsed.count,
        hotZones,
        origin: new URL(req.url).origin,
        modelId: model,
      }).catch(console.error);
      return new Response(
        `[gpu] dispatch ${parsed.count} workers (${hotZones.length} zones)\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    case "kill": {
      return textStreamResponse(
        "",
        kernelStream(
          `User requested kill agent ${parsed.agentId}. Acknowledge briefly with [kernel] prefix.`,
          model,
          createTaskId()
        )
      );
    }

    default: {
      return textStreamResponse(
        "",
        kernelStream(
          `Unknown command: "${parsed.raw}". List valid shell commands briefly with [kernel] prefix.`,
          model,
          undefined
        )
      );
    }
  }
}
