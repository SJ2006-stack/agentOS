import { OPENROUTER_KEY_FAULT } from "@/lib/ai/faults";
import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { agentNeedsLlm } from "@/lib/ai/agent-llm-policy";
import { isOpenRouterConfigured, resolveModelId } from "@/lib/ai/model";
import {
  incrementalStreamResponse,
  streamChatWithTools,
} from "@/lib/ai/openrouter-agent";
import { parseShellCommand } from "@/lib/os/types";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { isHydraConfigured } from "@/lib/hydradb/client";
import {
  formatMemoryStream,
  recallGraphContext,
  recallPreferences,
  writeUserInteraction,
} from "@/lib/hydradb/memory";
import { createTaskId } from "@/lib/os/pipeline";
import { runCpuPipeline } from "@/lib/ai/run-cpu";
import { listAllAgentTemplates } from "@/lib/os/agent-graph";
import { spawnAgentTemplate } from "@/lib/os/agent-spawn";
import {
  getActiveAgents,
  getCurrentTaskId,
  setCurrentTaskId,
} from "@/lib/os/active-agents";
import {
  createAndPersistCustomAgent,
  isCustomTemplateId,
} from "@/lib/agents/custom-registry";

export const maxDuration = 120;

async function writeKernelStream(
  write: (chunk: string) => void,
  prompt: string,
  model: string,
  taskId?: string
) {
  for await (const chunk of streamChatWithTools({
    modelId: model,
    system: KERNEL_SYSTEM,
    prompt,
    tools: createKernelTools({ taskId }),
    maxSteps: 3,
  })) {
    write(chunk);
  }
}

export async function POST(req: Request) {
  const { command, modelId: requestedModelId } = (await req.json()) as {
    command: string;
    modelId?: string;
  };
  const model = resolveModelId(requestedModelId);
  const parsed = parseShellCommand(command);
  const origin = new URL(req.url).origin;

  if (isHydraConfigured()) {
    void writeUserInteraction(command, `route:${parsed.type}`, getCurrentTaskId() ?? undefined);
  }

  void broadcastOsEvent("os:kernel", "command_routed", {
    command,
    route:
      parsed.type === "submit"
        ? "cpu"
        : parsed.type === "recall" ||
            parsed.type === "memory_stream" ||
            parsed.type === "show_memory"
          ? "hydradb"
          : parsed.type === "status" ||
              parsed.type === "list_agents" ||
              parsed.type === "agent_status"
            ? "status"
            : parsed.type === "spawn_agent" || parsed.type === "create_agent"
              ? "kernel"
              : "kernel",
  });

  const needsHydra =
    parsed.type === "recall" ||
    parsed.type === "memory_stream" ||
    parsed.type === "show_memory" ||
    parsed.type === "spawn_agent" ||
    parsed.type === "create_agent";

  if (needsHydra && !isHydraConfigured()) {
    return new Response(
      "[fault] HYDRADB_API_KEY missing — copy .env.example to .env.local\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const needsLlm =
    parsed.type === "kill" ||
    parsed.type === "unknown" ||
    parsed.type === "recall" ||
    parsed.type === "memory_stream" ||
    parsed.type === "show_memory" ||
    (parsed.type === "spawn_agent" &&
      agentNeedsLlm(parsed.templateId, "spawn"));

  if (needsLlm && !isOpenRouterConfigured()) {
    return new Response(OPENROUTER_KEY_FAULT, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  switch (parsed.type) {
    case "submit": {
      const taskId = createTaskId();
      setCurrentTaskId(taskId);
      if (isHydraConfigured()) {
        void writeUserInteraction(command, `submit task ${taskId}`, taskId);
      }
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

      return incrementalStreamResponse(
        `[kernel] memory stream: "${query}"…\n`,
        async (write) => {
          const agg = await recallGraphContext(query);
          const formatted = formatMemoryStream(agg.chunks, agg.queryPaths);
          write(`${formatted}\n`);
          await writeKernelStream(
            write,
            `User requested memory stream for: "${query}". Call stream_memory_to_user. Preloaded:\n${formatted}`,
            model,
            undefined
          );
        }
      );
    }

    case "status": {
      return incrementalStreamResponse("[kernel] status…\n", async (write) => {
        const hydra = isHydraConfigured();
        const openRouter = isOpenRouterConfigured();
        const recent = hydra
          ? await recallPreferences({ query: "status", max_results: 3 })
          : { chunks: [], queryPaths: [] };
        const active = getActiveAgents();
        const lines = [
          "[kernel] DevFactory OS status",
          `[kernel] OpenRouter: ${openRouter ? "configured" : "missing OPENROUTER_API_KEY"}`,
          `[kernel] HydraDB: ${hydra ? "connected" : "disconnected"}`,
          `[kernel] memory chunks: ${recent.chunks.length}`,
          `[kernel] active agents: ${active.length ? active.join(", ") : "(none)"}`,
          `[kernel] task: ${getCurrentTaskId() ?? "(none)"}`,
        ];
        write(lines.join("\n") + "\n");
      });
    }

    case "list_agents": {
      return incrementalStreamResponse("[kernel] agents…\n", async (write) => {
        const templates = listAllAgentTemplates();
        const lines = ["[kernel] agent templates:"];
        for (const t of templates) {
          const tag = isCustomTemplateId(t.id) ? "custom" : "builtin";
          lines.push(`  ${t.id}  role=${t.role}  [${tag}]`);
        }
        lines.push(`[kernel] ${templates.length} templates — spawn agent <id>`);
        write(lines.join("\n") + "\n");
      });
    }

    case "agent_status": {
      return incrementalStreamResponse("[kernel] agent status…\n", async (write) => {
        const taskId = getCurrentTaskId();
        const active = getActiveAgents();
        const lines = [
          "[kernel] agent status",
          `[kernel] current task: ${taskId ?? "(none)"}`,
          `[kernel] active: ${active.length ? active.join(", ") : "(none)"}`,
        ];
        write(lines.join("\n") + "\n");
      });
    }

    case "spawn_agent": {
      return incrementalStreamResponse(
        `[kernel] spawn ${parsed.templateId}…\n`,
        async (write) => {
          const result = await spawnAgentTemplate({
            templateId: parsed.templateId,
            modelId: model,
            origin,
            command,
            write,
          });
          if (!result.ok) {
            write(`[fault] ${result.message}\n`);
          }
        }
      );
    }

    case "create_agent": {
      return incrementalStreamResponse(
        `[kernel] create agent ${parsed.name}…\n`,
        async (write) => {
          try {
            const record = await createAndPersistCustomAgent({
              name: parsed.name,
              role: parsed.role,
            });
            void writeUserInteraction(
              command,
              `created custom agent ${record.id}`,
              getCurrentTaskId() ?? undefined
            );
            write(
              `[kernel] custom agent registered: ${record.id}\n[kernel] role: ${record.role}\n[kernel] spawn with: spawn agent ${record.id}\n`
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "create agent failed";
            write(`[fault] ${msg}\n`);
          }
        }
      );
    }

    case "spawn": {
      const taskId = createTaskId();
      const hotZones = Array.from({ length: Math.min(parsed.count, 12) }, (_, i) => ({
        x: (i * 3) % 16,
        y: (i * 2) % 16,
        heat: 0.5 + (i % 5) * 0.1,
      }));
      return incrementalStreamResponse(
        `[gpu] dispatch ${parsed.count} workers…\n`,
        async (write) => {
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
            origin,
            modelId: model,
          }).catch(console.error);
          write(`[gpu] ${parsed.count} workers (${hotZones.length} zones) task=${taskId}\n`);
        }
      );
    }

    case "kill": {
      return incrementalStreamResponse(
        `[kernel] kill ${parsed.agentId}…\n`,
        async (write) => {
          await writeKernelStream(
            write,
            `User requested kill agent ${parsed.agentId}. Acknowledge briefly with [kernel] prefix.`,
            model,
            createTaskId()
          );
        }
      );
    }

    default: {
      return incrementalStreamResponse("[kernel] …\n", async (write) => {
        await writeKernelStream(
          write,
          `Unknown command: "${parsed.raw}". List valid shell commands briefly with [kernel] prefix. Include: spawn agent <id>, agents, agent status, create agent <name> "<role>".`,
          model,
          undefined
        );
      });
    }
  }
}
