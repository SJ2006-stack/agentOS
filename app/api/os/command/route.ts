export const dynamic = "force-dynamic";

import { GEMINI_KEY_FAULT } from "@/lib/ai/faults";
import { KERNEL_SYSTEM } from "@/lib/ai/agents";
import { createKernelTools } from "@/lib/ai/kernel-tools";
import { agentNeedsLlm } from "@/lib/ai/agent-llm-policy";
import { isGeminiConfigured, resolveModelId } from "@/lib/ai/model";
import {
  incrementalStreamResponse,
  streamChatWithTools,
} from "@/lib/ai/gemini-agent";
import { parseShellCommand, isBuildDemoTask, type ShellCommand } from "@/lib/os/types";
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
import { runBuildDemo } from "@/lib/os/run-build-demo";
import {
  getAgentTemplate,
  listAllAgentTemplates,
} from "@/lib/os/agent-graph";
import { spawnAgentTemplate } from "@/lib/os/agent-spawn";
import {
  jsonCommandFault,
  wantsJsonCommandResponse,
} from "@/lib/os/command-json";
import {
  getActiveAgents,
  getCurrentTaskId,
  setCurrentTaskId,
} from "@/lib/os/active-agents";
import {
  createAndPersistCustomAgent,
  isCustomTemplateId,
} from "@/lib/os/custom-registry";

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

function agentPayload(templateId: string) {
  const template = getAgentTemplate(templateId);
  if (!template) return { templateId };
  return {
    templateId: template.id,
    role: template.role,
    subTenantId: template.subTenantId,
    displayName: template.displayName,
    edges: template.edges,
  };
}

async function handleJsonCommand(
  parsed: ShellCommand,
  ctx: { command: string; model: string; origin: string }
): Promise<Response> {
  const { command, model, origin } = ctx;

  switch (parsed.type) {
    case "spawn_agent": {
      const output: string[] = [];
      const result = await spawnAgentTemplate({
        templateId: parsed.templateId,
        modelId: model,
        origin,
        command,
        write: (chunk) => {
          if (chunk) output.push(chunk);
        },
      });
      return Response.json(
        {
          ok: result.ok,
          type: "spawn_agent",
          agent: {
            ...agentPayload(parsed.templateId),
            taskId: result.taskId,
            message: result.message,
          },
          output: output.join(""),
        },
        { status: result.ok ? 200 : 502 }
      );
    }

    case "create_agent": {
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
        return Response.json({
          ok: true,
          type: "create_agent",
          agent: {
            id: record.id,
            name: record.name,
            role: record.role,
            subTenantId: record.subTenantId,
            edges: record.edges,
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "create agent failed";
        return Response.json(
          { ok: false, type: "create_agent", error: msg },
          { status: 400 }
        );
      }
    }

    case "list_agents": {
      const templates = listAllAgentTemplates();
      return Response.json({
        ok: true,
        type: "list_agents",
        agents: templates.map((t) => ({
          id: t.id,
          role: t.role,
          subTenantId: t.subTenantId,
          custom: isCustomTemplateId(t.id),
          displayName: t.displayName,
        })),
        count: templates.length,
      });
    }

    case "agent_status": {
      return Response.json({
        ok: true,
        type: "agent_status",
        taskId: getCurrentTaskId(),
        activeAgents: getActiveAgents(),
      });
    }

    case "status": {
      const hydra = isHydraConfigured();
      const gemini = isGeminiConfigured();
      const recent = hydra
        ? await recallPreferences({ query: "status", max_results: 3 })
        : { chunks: [], queryPaths: [] };
      return Response.json({
        ok: true,
        type: "status",
        gemini,
        hydra,
        memoryChunks: recent.chunks.length,
        activeAgents: getActiveAgents(),
        taskId: getCurrentTaskId(),
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
        origin,
        modelId: model,
      }).catch(console.error);
      return Response.json({
        ok: true,
        type: "spawn",
        taskId,
        workerCount: parsed.count,
        hotZones,
      });
    }

    case "unknown":
      return Response.json(
        {
          ok: false,
          type: "unknown",
          error: `unknown command: ${parsed.raw}`,
          hint: "spawn agent <id> | agents | create agent <name> \"<role>\" | status",
        },
        { status: 400 }
      );

    default:
      return Response.json(
        {
          ok: false,
          type: parsed.type,
          error: `command "${parsed.type}" requires text streaming — omit format=json or Accept: application/json`,
        },
        { status: 501 }
      );
  }
}


export async function POST(req: Request) {
  const body = (await req.json()) as {
    command: string;
    modelId?: string;
    format?: string;
  };
  const { command, modelId: requestedModelId } = body;
  const wantsJson = wantsJsonCommandResponse(req, body);
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
    const msg = "HYDRADB_API_KEY missing — copy .env.example to .env.local";
    if (wantsJson) return jsonCommandFault(msg);
    return new Response(`[fault] ${msg}\n`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const needsLlm =
    parsed.type === "kill" ||
    parsed.type === "unknown" ||
    parsed.type === "recall" ||
    parsed.type === "memory_stream" ||
    parsed.type === "show_memory" ||
    (parsed.type === "spawn_agent" &&
      agentNeedsLlm(parsed.templateId, "spawn"));

  if (needsLlm && !isGeminiConfigured()) {
    if (wantsJson) {
      return jsonCommandFault(
        GEMINI_KEY_FAULT.replace(/^\[fault\]\s*/, "").trim()
      );
    }
    return new Response(GEMINI_KEY_FAULT, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (wantsJson) {
    return handleJsonCommand(parsed, { command, model, origin });
  }

  switch (parsed.type) {
    case "submit": {
      const taskId = createTaskId();
      setCurrentTaskId(taskId);
      if (isHydraConfigured()) {
        void writeUserInteraction(command, `submit task ${taskId}`, taskId);
      }
      if (isBuildDemoTask(parsed.task)) {
        return incrementalStreamResponse(
          `[kernel] build demo queued: ${taskId}\n`,
          async (write) => {
            await runBuildDemo(taskId, parsed.task, origin, write);
          }
        );
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
        const gemini = isGeminiConfigured();
        const recent = hydra
          ? await recallPreferences({ query: "status", max_results: 3 })
          : { chunks: [], queryPaths: [] };
        const active = getActiveAgents();
        const lines = [
          "[kernel] DevFactory OS status",
          `[kernel] Gemini: ${gemini ? "configured" : "missing GEMINI_API_KEY"}`,
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
