import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { KERNEL_SYSTEM, MODEL_ID } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
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

function plainTextStream(
  preamble: string,
  textStream: AsyncIterable<string>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (preamble) controller.enqueue(encoder.encode(preamble));
      for await (const chunk of textStream) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function kernelStream(prompt: string, taskId?: string) {
  return streamText({
    model: openai(MODEL_ID),
    system: KERNEL_SYSTEM,
    prompt,
    tools: createKernelTools({ taskId }),
    stopWhen: stepCountIs(6),
  });
}

export async function POST(req: Request) {
  const { command } = (await req.json()) as { command: string };
  const parsed = parseShellCommand(command);

  await broadcastOsEvent("os:kernel", "command_routed", {
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

  if (parsed.type === "submit" && !process.env.OPENAI_API_KEY) {
    return new Response(
      "[fault] OPENAI_API_KEY required for CPU pipeline\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  switch (parsed.type) {
    case "submit": {
      const taskId = createTaskId();
      const origin = new URL(req.url).origin;
      void runCpuPipeline(taskId, parsed.task, origin).catch(console.error);
      const result = kernelStream(
        `User submitted task: "${parsed.task}". taskId=${taskId}. Acknowledge routing to CPU in 2 lines prefixed [kernel].`,
        taskId
      );
      return plainTextStream(
        `[kernel] task queued: ${taskId}\n[cpu] pipeline starting…\n`,
        result.textStream
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
      const result = kernelStream(
        `User requested memory stream for: "${query}". Call stream_memory_to_user. Preloaded:\n${formatted}`,
        undefined
      );
      return plainTextStream(`${formatted}\n`, result.textStream);
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
      const origin = new URL(req.url).origin;
      const hotZones = Array.from({ length: Math.min(parsed.count, 12) }, (_, i) => ({
        x: (i * 3) % 16,
        y: (i * 2) % 16,
        heat: 0.5 + (i % 5) * 0.1,
      }));
      await broadcastOsEvent("os:gpu", "dispatch", {
        hotZones,
        activeWorkers: parsed.count,
        taskId,
      });
      const { invokeGpuAgents } = await import("@/lib/ai/run-cpu");
      void invokeGpuAgents({
        taskId,
        workerCount: parsed.count,
        hotZones,
        origin,
      }).catch(console.error);
      return new Response(
        `[gpu] dispatch ${parsed.count} workers (${hotZones.length} zones)\n`,
        { headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    case "kill": {
      const result = kernelStream(
        `User requested kill agent ${parsed.agentId}. Acknowledge briefly with [kernel] prefix.`,
        createTaskId()
      );
      return plainTextStream("", result.textStream);
    }

    default: {
      const result = kernelStream(
        `Unknown command: "${parsed.raw}". List valid shell commands briefly with [kernel] prefix.`,
        undefined
      );
      return plainTextStream("", result.textStream);
    }
  }
}
