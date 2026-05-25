import "server-only";
import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { CPU_SYSTEM, cpuStepPrompt, MODEL_ID } from "@/lib/ai/agents";
import { createOsTools } from "@/lib/ai/tools";
import { addMemoryToHydra, cpuStepPrefix } from "@/lib/hydradb/memory";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { CPU_STEPS, type GpuDispatchPayload } from "@/lib/os/types";
import { getPipeline, setPipeline, startPipeline } from "@/lib/os/pipeline";

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
}): Promise<void> {
  const base = resolveOrigin(input.origin);
  await fetch(`${base}/api/agents/gpu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: input.taskId,
      workerCount: input.workerCount,
      hotZones: input.hotZones,
    }),
  }).catch(console.error);
}

export async function runCpuPipeline(
  taskId: string,
  task: string,
  origin?: string
): Promise<void> {
  startPipeline(taskId, task);

  for (const step of CPU_STEPS) {
    const pipe = getPipeline(taskId);
    if (!pipe) break;

    await broadcastOsEvent("os:cpu", "step_start", {
      step,
      taskId,
      status: "start",
    });
    await broadcastOsEvent("os:cpu", "pipeline_state", {
      currentStep: step,
      taskId,
      completedSteps: pipe.completedSteps,
    });

    if (process.env.HYDRADB_API_KEY) {
      await addMemoryToHydra({
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

    try {
      const result = streamText({
        model: openai(MODEL_ID),
        system: CPU_SYSTEM,
        prompt: cpuStepPrompt(step, task, taskId),
        tools: createOsTools({ taskId, step, origin }),
        stopWhen: stepCountIs(5),
      });
      await result.text;
    } catch (e) {
      await broadcastOsEvent("os:cpu", "step_complete", {
        step,
        taskId,
        message: `fault: ${e instanceof Error ? e.message : "step failed"}`,
      });
    }

    const updated = getPipeline(taskId);
    const completedSteps = [...(updated?.completedSteps ?? []), step];
    setPipeline(taskId, {
      task,
      currentStep: null,
      completedSteps,
    });

    await broadcastOsEvent("os:cpu", "step_complete", {
      step,
      taskId,
      status: "complete",
    });
    await broadcastOsEvent("os:cpu", "pipeline_state", {
      currentStep: null,
      taskId,
      completedSteps,
    });

  }
}
