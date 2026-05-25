import "server-only";
import { resolveModelId } from "@/lib/ai/model";
import { createOsTools } from "@/lib/ai/tools";
import { addMemoryToHydra, cpuStepPrefix } from "@/lib/hydradb/memory";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { CPU_STEPS, type CpuStep, type GpuDispatchPayload } from "@/lib/os/types";
import { getPipeline, setPipeline, startPipeline } from "@/lib/os/pipeline";
import type { OpenRouterToolDef } from "@/lib/ai/openrouter-agent";

function resolveOrigin(origin?: string): string {
  if (origin) return origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function invokeGpuAgents(input: {
  taskId: string;
  workerCount: number;
  hotZones?: GpuDispatchPayload["hotZones"];
  origin?: string;
  modelId?: string;
}): Promise<void> {
  const base = resolveOrigin(input.origin);
  const modelId = resolveModelId(input.modelId);
  void fetch(`${base}/api/agents/gpu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: input.taskId,
      workerCount: input.workerCount,
      hotZones: input.hotZones,
      modelId,
    }),
  }).catch(console.error);
}

export type PipelineWrite = (chunk: string) => void;

function defaultHotZones(count = 8): GpuDispatchPayload["hotZones"] {
  return Array.from({ length: count }, (_, i) => ({
    x: (i * 3) % 16,
    y: (i * 2) % 16,
    heat: 0.5 + (i % 5) * 0.1,
  }));
}

async function runToolOnlyStep(
  step: CpuStep,
  taskId: string,
  task: string,
  tools: OpenRouterToolDef[],
  write?: PipelineWrite
): Promise<void> {
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

  switch (step) {
    case "INTAKE":
      await byName.emit_io?.execute({
        tool: "intake",
        layer: "exec",
        args: { task: task.slice(0, 120) },
        persist: true,
      });
      break;
    case "PLAN":
      await byName.plan_task?.execute({
        plan: task.slice(0, 200),
        steps: [...CPU_STEPS],
      });
      break;
    case "ROUTE":
      await byName.route_workers?.execute({
        queues: ["default", "gpu"],
        priority: 1,
      });
      break;
    case "VERIFY":
      await byName.emit_io?.execute({
        tool: "verify",
        layer: "exec",
        args: { taskId, ok: true },
        persist: true,
      });
      break;
    case "DISPATCH": {
      const hotZones = defaultHotZones(8);
      await byName.gpu_dispatch?.execute({
        zones: hotZones,
        workerCount: 96,
      });
      break;
    }
    case "COMMIT":
      await byName.write_memory?.execute({
        text: `[COMMIT] task ${taskId}: ${task.slice(0, 400)}`,
        infer: false,
      });
      break;
    default:
      break;
  }
  write?.(`[cpu] ${step} complete\n`);
}

async function broadcastStep(
  step: CpuStep,
  taskId: string,
  completedSteps: string[],
  phase: "start" | "complete",
  message?: string
): Promise<void> {
  const payload = {
    step,
    taskId,
    status: phase === "start" ? ("start" as const) : ("complete" as const),
    message,
  };
  const pipeline = {
    currentStep: phase === "start" ? step : null,
    taskId,
    completedSteps: completedSteps as CpuStep[],
  };
  await Promise.all([
    broadcastOsEvent(
      "os:cpu",
      phase === "start" ? "step_start" : "step_complete",
      payload
    ),
    broadcastOsEvent("os:cpu", "pipeline_state", pipeline),
  ]);
}

export async function runCpuPipeline(
  taskId: string,
  task: string,
  origin?: string,
  modelId?: string,
  write?: PipelineWrite
): Promise<void> {
  const model = resolveModelId(modelId);
  startPipeline(taskId, task);

  for (const step of CPU_STEPS) {
    const pipe = getPipeline(taskId);
    if (!pipe) break;

    write?.(`[cpu] ${step} starting…\n`);
    await broadcastStep(step, taskId, pipe.completedSteps, "start");

    if (process.env.HYDRADB_API_KEY) {
      void addMemoryToHydra({
        sub_tenant_id: cpuStepPrefix(step),
        text: `[${step}] starting task ${taskId}: ${task.slice(0, 120)}`,
        infer: false,
        metadata: {
          agent_id: cpuStepPrefix(step),
          pipeline_step: step,
          task_id: taskId,
        },
      });
    }

    setPipeline(taskId, {
      task,
      currentStep: step,
      completedSteps: pipe.completedSteps,
    });

    const tools = createOsTools({ taskId, step, origin, modelId: model });

    try {
      await runToolOnlyStep(step, taskId, task, tools, write);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "step failed";
      write?.(`[cpu] ${step} fault: ${msg}\n`);
      await broadcastOsEvent("os:cpu", "step_complete", {
        step,
        taskId,
        message: `fault: ${msg}`,
      });
    }

    const updated = getPipeline(taskId);
    const completedSteps = [...(updated?.completedSteps ?? []), step];
    setPipeline(taskId, {
      task,
      currentStep: null,
      completedSteps,
    });

    await broadcastStep(step, taskId, completedSteps, "complete");
  }

  write?.(`[kernel] pipeline finished: ${taskId}\n`);
}
