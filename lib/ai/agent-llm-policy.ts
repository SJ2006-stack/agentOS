import "server-only";
import { AGENT_GRAPH } from "@/lib/os/agent-graph-data";
import { templateIdForCpuStep } from "@/lib/os/agent-graph-data";
import { isCustomTemplateId } from "@/lib/os/custom-registry";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";

/**
 * Central policy: when DevFactory OS may call OpenRouter (`openrouter/free`).
 * All LLM usage bills to OPENROUTER_API_KEY — see https://openrouter.ai/activity
 */
export type AgentLlmAction = "spawn" | "step" | "recall";

const CPU_LLM_STEPS = new Set<CpuStep>(["INTAKE", "PLAN", "VERIFY"]);
const CPU_TOOL_ONLY_STEPS = new Set<CpuStep>(["ROUTE", "DISPATCH", "COMMIT"]);

function cpuStepFromTemplateId(templateId: string): CpuStep | undefined {
  const entry = Object.entries(CPU_STEPS).find(
    ([, step]) => templateIdForCpuStep(step) === templateId
  );
  return entry ? CPU_STEPS[Number(entry[0])] : undefined;
}

/** Optional GPU worker LLM on spawn (short completion). Default: tool-only batch. */
export function gpuSpawnUsesLlm(): boolean {
  return process.env.GPU_SPAWN_LLM === "1";
}

export function agentNeedsLlm(templateId: string, action: AgentLlmAction): boolean {
  if (isCustomTemplateId(templateId)) return true;

  if (templateId === "kernel.orchestrator") return true;

  if (templateId === "user.session") return action === "recall";

  if (templateId === "hydradb.memory" || templateId === "io.bus") return false;

  if (templateId === "gpu.worker" || templateId.startsWith("gpu.worker.")) {
    return action === "spawn" && gpuSpawnUsesLlm();
  }

  const cpuStep = cpuStepFromTemplateId(templateId);
  if (cpuStep) {
    if (action === "recall") return false;
    if (CPU_TOOL_ONLY_STEPS.has(cpuStep)) return false;
    if (CPU_LLM_STEPS.has(cpuStep)) return true;
    return false;
  }

  if (AGENT_GRAPH[templateId]) return false;

  return action !== "recall";
}

export interface AgentLlmPolicyRow {
  templateId: string;
  spawn: boolean;
  step: boolean;
  recall: boolean;
}

/** Human-readable policy matrix for docs and build reports. */
export function buildAgentLlmPolicyTable(): AgentLlmPolicyRow[] {
  const ids = [
    "user.session",
    "kernel.orchestrator",
    ...CPU_STEPS.map((s) => templateIdForCpuStep(s)),
    "gpu.worker",
    "gpu.worker.w001",
    "io.bus",
    "hydradb.memory",
    "custom.example",
  ];

  return ids.map((templateId) => ({
    templateId,
    spawn: agentNeedsLlm(templateId, "spawn"),
    step: agentNeedsLlm(templateId, "step"),
    recall: agentNeedsLlm(templateId, "recall"),
  }));
}

export const OPENROUTER_BILLING_NOTE =
  "LLM usage is billed to your OpenRouter API key (OPENROUTER_API_KEY) — see https://openrouter.ai/activity";
