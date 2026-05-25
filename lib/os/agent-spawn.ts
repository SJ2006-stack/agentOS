import "server-only";
import { agentNeedsLlm } from "@/lib/ai/agent-llm-policy";
import { OPENROUTER_KEY_FAULT } from "@/lib/ai/faults";
import { CPU_SYSTEM, cpuStepPrompt } from "@/lib/ai/agents";
import { isOpenRouterConfigured } from "@/lib/ai/model";
import { createOsTools } from "@/lib/ai/tools";
import { invokeGpuAgents } from "@/lib/ai/run-cpu";
import {
  runChatWithTools,
  streamChatContent,
  type OpenRouterToolDef,
} from "@/lib/ai/openrouter-agent";
import { emitUsageFeedback } from "@/lib/ai/usage-feedback";
import {
  activateAgent,
  deactivateAgent,
  getCurrentTaskId,
  setCurrentTaskId,
} from "@/lib/os/active-agents";
import {
  getAgentTemplate,
  HYDRA_MEMORY_HUB_ID,
  templateIdForCpuStep,
} from "@/lib/os/agent-graph";
import { createTaskId } from "@/lib/os/pipeline";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { writeAgentMemory, writeUserInteraction } from "@/lib/hydradb/memory";

const CPU_ID_TO_STEP: Record<string, CpuStep> = Object.fromEntries(
  CPU_STEPS.map((step) => [templateIdForCpuStep(step), step])
) as Record<string, CpuStep>;

export type SpawnWrite = (chunk: string) => void;

async function broadcastNodeActive(
  templateId: string,
  taskId: string,
  active: boolean
): Promise<void> {
  const channel = templateId.startsWith("cpu.") ? "os:cpu" : "os:graph";
  await broadcastOsEvent(channel, "node_active", {
    nodeId: templateId,
    taskId,
    active,
  });
}

async function runToolOnlySpawn(
  templateId: string,
  taskId: string,
  tools: OpenRouterToolDef[],
  write?: SpawnWrite
): Promise<string> {
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  if (templateId === "io.bus") {
    await byName.emit_io?.execute({
      tool: "spawn_io",
      layer: "exec",
      args: { taskId, templateId },
      persist: true,
    });
    write?.("[agent] io.bus relay active (no LLM)\n");
    return "io.bus activated";
  }
  if (templateId === HYDRA_MEMORY_HUB_ID) {
    await writeAgentMemory(
      HYDRA_MEMORY_HUB_ID,
      `[hub] spawn ping task=${taskId}`,
      { spawn: true, task_id: taskId }
    );
    write?.("[agent] hydradb.memory hub ping written (no LLM)\n");
    return "hydradb hub ping";
  }
  const cpuStep = CPU_ID_TO_STEP[templateId];
  if (cpuStep) {
    switch (cpuStep) {
      case "ROUTE":
        await byName.route_workers?.execute({
          queues: ["default", "gpu"],
          priority: 1,
        });
        break;
      case "DISPATCH": {
        const hotZones = Array.from({ length: 4 }, (_, i) => ({
          x: (i * 3) % 16,
          y: (i * 2) % 16,
          heat: 0.55,
        }));
        await byName.gpu_dispatch?.execute({ zones: hotZones, workerCount: 8 });
        break;
      }
      case "COMMIT":
        await byName.write_memory?.execute({
          text: `[COMMIT] spawn ${templateId} task ${taskId}`,
          infer: false,
        });
        break;
      default:
        break;
    }
  }
  write?.(`[agent] ${templateId} activated (no LLM)\n`);
  return `${templateId} tool-only`;
}

export async function spawnAgentTemplate(input: {
  templateId: string;
  modelId: string;
  taskId?: string;
  origin?: string;
  command?: string;
  write?: SpawnWrite;
}): Promise<{ ok: boolean; message: string; taskId: string }> {
  const template = getAgentTemplate(input.templateId);
  if (!template) {
    return { ok: false, message: `unknown template: ${input.templateId}`, taskId: "" };
  }

  const needsLlm = agentNeedsLlm(input.templateId, "spawn");
  if (needsLlm && !isOpenRouterConfigured()) {
    input.write?.(OPENROUTER_KEY_FAULT);
    return { ok: false, message: "OPENROUTER_API_KEY missing", taskId: "" };
  }

  const taskId = input.taskId ?? getCurrentTaskId() ?? createTaskId();
  if (!getCurrentTaskId()) setCurrentTaskId(taskId);

  input.write?.(`[agent] spawning ${input.templateId} (${template.role})…\n`);
  activateAgent(input.templateId, taskId);
  void writeUserInteraction(
    input.command ?? `spawn agent ${input.templateId}`,
    `spawn ${input.templateId}`,
    taskId
  );
  void writeAgentMemory(
    input.templateId,
    `[spawn] ${input.templateId} activated for task ${taskId}`,
    { spawn: true, task_id: taskId, role: template.role }
  );
  void broadcastNodeActive(input.templateId, taskId, true);

  const usageOpts = {
    write: input.write,
    agentId: input.templateId,
    model: input.modelId,
  };

  try {
    if (input.templateId === "gpu.worker") {
      const hotZones = Array.from({ length: 4 }, (_, i) => ({
        x: (i * 3) % 16,
        y: (i * 2) % 16,
        heat: 0.55,
      }));
      void invokeGpuAgents({
        taskId,
        workerCount: 4,
        hotZones,
        origin: input.origin,
        modelId: input.modelId,
      });
      input.write?.(
        needsLlm
          ? "[gpu] 4 workers dispatched (optional LLM per worker)\n"
          : "[gpu] 4 workers dispatched (tool-only batch)\n"
      );
    } else if (!needsLlm) {
      const cpuStep = CPU_ID_TO_STEP[input.templateId];
      const tools = createOsTools({
        taskId,
        step: cpuStep ?? "INTAKE",
        origin: input.origin,
        modelId: input.modelId,
      });
      await runToolOnlySpawn(input.templateId, taskId, tools, input.write);
    } else if (CPU_ID_TO_STEP[input.templateId]) {
      const step = CPU_ID_TO_STEP[input.templateId]!;
      const tools = createOsTools({
        taskId,
        step,
        origin: input.origin,
        modelId: input.modelId,
      });
      const { text } = await runChatWithTools({
        modelId: input.modelId,
        system: CPU_SYSTEM,
        prompt: cpuStepPrompt(step, `spawn:${input.templateId}`, taskId),
        tools,
        maxSteps: 3,
        onUsage: (u) => emitUsageFeedback(u, usageOpts),
      });
      input.write?.(`[cpu] ${step}: ${text.slice(0, 200)}\n`);
    } else {
      const text: string[] = [];
      for await (const chunk of streamChatContent({
        modelId: input.modelId,
        system: template.systemPrompt,
        prompt: `Agent ${input.templateId} spawned for task ${taskId}. Acknowledge activation in one short line with your role prefix.`,
        onUsage: (u) => emitUsageFeedback(u, usageOpts),
      })) {
        text.push(chunk);
        input.write?.(chunk);
      }
      await writeAgentMemory(
        input.templateId,
        `[spawn-result] ${text.join("").slice(0, 400)}`,
        { task_id: taskId, spawn_result: true }
      );
    }

    input.write?.(`[agent] ${input.templateId} complete\n`);
    return { ok: true, message: `${input.templateId} spawned`, taskId };
  } finally {
    deactivateAgent(input.templateId, taskId);
    void broadcastNodeActive(input.templateId, taskId, false);
  }
}
