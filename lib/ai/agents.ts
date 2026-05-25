import "server-only";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";

export {
  KERNEL_SYSTEM,
  CPU_SYSTEM,
  GPU_SYSTEM,
} from "@/lib/os/agent-prompts";

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

export { DEFAULT_MODEL_ID } from "@/lib/ai/models";
