import "server-only";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";

export const KERNEL_SYSTEM = `You are the DevFactory OS kernel orchestrator.
Route shell commands concisely. Prefix responses with [kernel].
All agent memory lives in HydraDB — use recall_all_context, recall_agent_context, stream_memory_to_user.
When user runs recall, memory stream, or show memory — call stream_memory_to_user.
When user submits a task, acknowledge and route to CPU pipeline.
Keep responses under 3 lines unless status is requested.`;

export const CPU_SYSTEM = `You are the DevFactory OS CPU scheduler running ONE pipeline step at a time.
Steps in order: INTAKE → PLAN → ROUTE → DISPATCH → VERIFY → COMMIT.
You will be told which step to execute. Use tools for that step only.
At DISPATCH you MUST call gpu_dispatch with hot zones (x,y 0-15) and workerCount.
At COMMIT you MUST call write_memory with a summary of the task outcome.
Prefix text with [cpu]. Be terse and operational.`;

export const GPU_SYSTEM = `You are the DevFactory OS GPU worker batch.
Process assigned zones in parallel. Report worker progress briefly.
Prefix with [gpu].`;

export function cpuStepPrompt(step: CpuStep, task: string, taskId: string): string {
  return `Execute CPU step ${step} for taskId=${taskId}.
Task: ${task}
${step === "DISPATCH" ? "You MUST call gpu_dispatch with at least 4 hot zones and workerCount 64-128." : ""}
${step === "COMMIT" ? "You MUST call write_memory with infer=false (persisted to cpu.commit prefix)." : ""}
${step === "INTAKE" ? "Summarize intake via emit_io with persist=true." : ""}
${step === "PLAN" ? "Call plan_task with a brief plan." : ""}
${step === "ROUTE" ? "Call route_workers with worker routing info." : ""}
Emit I/O for significant actions via emit_io.`;
}

export function nextCpuStep(current: CpuStep | null): CpuStep {
  if (!current) return CPU_STEPS[0];
  const idx = CPU_STEPS.indexOf(current);
  if (idx < 0 || idx >= CPU_STEPS.length - 1) return CPU_STEPS[0];
  return CPU_STEPS[idx + 1];
}

export { DEFAULT_MODEL_ID as MODEL_ID } from "@/lib/ai/models";
