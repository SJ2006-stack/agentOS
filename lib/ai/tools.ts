import "server-only";
import { z } from "zod";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import {
  recallPreferences,
  writeAgentMemory,
} from "@/lib/hydradb/memory";
import { templateIdForCpuStep } from "@/lib/os/agent-graph-data";
import type { CpuStep } from "@/lib/os/types";
import { defineTool } from "@/lib/ai/openrouter-agent";
import type { OpenRouterToolDef } from "@/lib/ai/openrouter-agent";

export function createOsTools(ctx: {
  taskId: string;
  step?: CpuStep;
  agentId?: string;
  origin?: string;
  modelId?: string;
}): OpenRouterToolDef[] {
  const stepTemplateId = ctx.step
    ? templateIdForCpuStep(ctx.step)
    : "kernel.orchestrator";

  async function persistAgentMemory(
    templateId: string,
    text: string,
    metadata: Record<string, unknown>
  ) {
    await broadcastOsEvent("os:memory", "indexing", {
      agentId: templateId,
      status: "indexing",
    });

    const result = await writeAgentMemory(templateId, text, metadata);

    await broadcastOsEvent("os:memory", "slot_write", {
      memoryId: result.memoryId,
      agentId: templateId,
      preview: text.slice(0, 80),
      status: result.ok ? "indexed" : "error",
    });

    return result;
  }

  return [
    defineTool({
      name: "plan_task",
      description: "Record a plan for the current CPU task",
      inputSchema: z.object({
        plan: z.string(),
        steps: z.array(z.string()).optional(),
      }),
      execute: async ({ plan, steps }) => {
        const text = `PLAN: ${plan}${steps?.length ? ` | steps: ${steps.join(", ")}` : ""}`;
        await persistAgentMemory("cpu.plan", text, {
          pipeline_step: "PLAN",
          task_id: ctx.taskId,
        });
        await broadcastOsEvent("os:io", "tool_call", {
          tool: "plan_task",
          args: { plan, steps },
          layer: "exec",
          ts: Date.now(),
        });
        await broadcastOsEvent("os:cpu", "step_complete", {
          step: "PLAN",
          message: plan.slice(0, 120),
        });
        return { ok: true, plan };
      },
    }),
    defineTool({
      name: "route_workers",
      description: "Route work to worker queues",
      inputSchema: z.object({
        queues: z.array(z.string()),
        priority: z.number().optional(),
      }),
      execute: async ({ queues, priority }) => {
        const text = `ROUTE: queues=${queues.join(",")} priority=${priority ?? 0}`;
        await persistAgentMemory("cpu.route", text, {
          pipeline_step: "ROUTE",
          task_id: ctx.taskId,
        });
        await broadcastOsEvent("os:io", "tool_call", {
          tool: "route_workers",
          args: { queues, priority },
          layer: "api",
          ts: Date.now(),
        });
        return { ok: true, routed: queues.length };
      },
    }),
    defineTool({
      name: "gpu_dispatch",
      description:
        "DISPATCH: broadcast GPU hot zones and spawn parallel workers",
      inputSchema: z.object({
        zones: z.array(
          z.object({
            x: z.number().min(0).max(15),
            y: z.number().min(0).max(15),
            heat: z.number().min(0).max(1),
          })
        ),
        workerCount: z.number().min(1).max(256),
      }),
      execute: async ({ zones, workerCount }) => {
        const hotZones = zones.map((z) => ({
          x: z.x,
          y: z.y,
          heat: z.heat,
        }));
        const text = `DISPATCH: ${workerCount} workers → zones ${JSON.stringify(hotZones.slice(0, 4))}`;
        await persistAgentMemory("cpu.dispatch", text, {
          pipeline_step: "DISPATCH",
          task_id: ctx.taskId,
        });
        await broadcastOsEvent("os:gpu", "dispatch", {
          hotZones,
          activeWorkers: workerCount,
          taskId: ctx.taskId,
        });
        const { invokeGpuAgents } = await import("@/lib/ai/run-cpu");
        void invokeGpuAgents({
          taskId: ctx.taskId,
          workerCount,
          hotZones,
          origin: ctx.origin,
          modelId: ctx.modelId,
        }).catch(console.error);
        await broadcastOsEvent("os:io", "tool_call", {
          tool: "gpu_dispatch",
          args: { zoneCount: hotZones.length, workerCount },
          layer: "exec",
          ts: Date.now(),
        });
        await broadcastOsEvent("os:cpu", "step_complete", {
          step: "DISPATCH",
          message: `dispatched ${workerCount} workers to ${hotZones.length} zones`,
        });
        return { ok: true, hotZones, workerCount };
      },
    }),
    defineTool({
      name: "write_memory",
      description: "Write task outcome to HydraDB memory (COMMIT step)",
      inputSchema: z.object({
        text: z.string(),
        infer: z.boolean().optional(),
      }),
      execute: async ({ text, infer }) => {
        return persistAgentMemory("cpu.commit", text, {
          pipeline_step: "COMMIT",
          task_id: ctx.taskId,
          infer: infer ?? false,
        });
      },
    }),
    defineTool({
      name: "recall_memory",
      description: "Recall preferences from HydraDB for current CPU context",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const r = await recallPreferences({
          query,
          sub_tenant_id: stepTemplateId,
        });
        await broadcastOsEvent("os:memory", "recall_result", {
          query,
          chunks: r.chunks,
          queryPaths: r.queryPaths,
        });
        return r;
      },
    }),
    defineTool({
      name: "emit_io",
      description: "Emit an I/O bus event; optionally persist summary to HydraDB",
      inputSchema: z.object({
        tool: z.string(),
        layer: z.enum(["fs", "api", "web", "exec"]),
        args: z.record(z.string(), z.unknown()).optional(),
        persist: z.boolean().optional(),
      }),
      execute: async ({ tool: toolName, layer, args, persist }) => {
        await broadcastOsEvent("os:io", "tool_call", {
          tool: toolName,
          args: args ?? {},
          layer,
          ts: Date.now(),
        });
        if (persist) {
          await persistAgentMemory(
            "io.bus",
            `IO ${layer}/${toolName}: ${JSON.stringify(args ?? {}).slice(0, 200)}`,
            {
              pipeline_step: "IO",
              task_id: ctx.taskId,
            }
          );
        }
        return { ok: true };
      },
    }),
  ];
}
