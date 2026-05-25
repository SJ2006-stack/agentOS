import {
  CPU_SYSTEM,
  GPU_SYSTEM,
  IO_BUS_SYSTEM,
  KERNEL_SYSTEM,
  USER_SESSION_SYSTEM,
} from "@/lib/os/agent-prompts";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";

export const HYDRA_MEMORY_HUB_ID = "hydradb.memory";

export interface AgentTemplate {
  id: string;
  subTenantId: string;
  role: string;
  systemPrompt: string;
  edges: string[];
}

const CPU_STEP_TO_ID: Record<CpuStep, string> = {
  INTAKE: "cpu.intake",
  PLAN: "cpu.plan",
  ROUTE: "cpu.route",
  DISPATCH: "cpu.dispatch",
  VERIFY: "cpu.verify",
  COMMIT: "cpu.commit",
};

const CPU_DOWNSTREAM: Record<CpuStep, string[]> = {
  INTAKE: ["cpu.plan"],
  PLAN: ["cpu.route"],
  ROUTE: ["cpu.dispatch"],
  DISPATCH: ["gpu.worker", "cpu.verify"],
  VERIFY: ["cpu.commit"],
  COMMIT: [],
};

function cpuTemplate(step: CpuStep): AgentTemplate {
  const id = CPU_STEP_TO_ID[step];
  return {
    id,
    subTenantId: id,
    role: `cpu.${step.toLowerCase()}`,
    systemPrompt: CPU_SYSTEM,
    edges: [...CPU_DOWNSTREAM[step], HYDRA_MEMORY_HUB_ID],
  };
}

const CPU_GRAPH_NODES = Object.fromEntries(
  CPU_STEPS.map((step) => [CPU_STEP_TO_ID[step], cpuTemplate(step)])
) as Record<string, AgentTemplate>;

/** Unified agent DAG — kernel routes user input; CPU chain feeds GPU; all nodes write to HydraDB hub. */
export const AGENT_GRAPH: Record<string, AgentTemplate> = {
  "user.session": {
    id: "user.session",
    subTenantId: "user.session",
    role: "user.session",
    systemPrompt: USER_SESSION_SYSTEM,
    edges: ["kernel.orchestrator", HYDRA_MEMORY_HUB_ID],
  },
  "kernel.orchestrator": {
    id: "kernel.orchestrator",
    subTenantId: "kernel.orchestrator",
    role: "kernel.orchestrator",
    systemPrompt: KERNEL_SYSTEM,
    edges: ["cpu.intake", HYDRA_MEMORY_HUB_ID],
  },
  ...CPU_GRAPH_NODES,
  "gpu.worker": {
    id: "gpu.worker",
    subTenantId: "gpu.worker",
    role: "gpu.worker",
    systemPrompt: GPU_SYSTEM,
    edges: [HYDRA_MEMORY_HUB_ID],
  },
  "io.bus": {
    id: "io.bus",
    subTenantId: "io.bus",
    role: "io.bus",
    systemPrompt: IO_BUS_SYSTEM,
    edges: [HYDRA_MEMORY_HUB_ID],
  },
  [HYDRA_MEMORY_HUB_ID]: {
    id: HYDRA_MEMORY_HUB_ID,
    subTenantId: "hydradb.memory",
    role: "hydradb.hub",
    systemPrompt: "HydraDB shared memory hub for the agent graph.",
    edges: [],
  },
};

export const AGENT_GRAPH_IDS = Object.keys(AGENT_GRAPH);

export function getBuiltinTemplate(id: string): AgentTemplate | undefined {
  return AGENT_GRAPH[id];
}

export function getDownstreamAgents(id: string): AgentTemplate[] {
  const node = AGENT_GRAPH[id];
  if (!node) return [];
  return node.edges
    .map((edgeId) => AGENT_GRAPH[edgeId])
    .filter((t): t is AgentTemplate => Boolean(t));
}

export function templateIdForCpuStep(step: CpuStep): string {
  return CPU_STEP_TO_ID[step];
}

export function gpuWorkerTemplateId(workerId: string): string {
  return `gpu.worker.${workerId}`;
}

export function subTenantForGpuWorker(workerId: string): string {
  return gpuWorkerTemplateId(workerId);
}

/** Prefixes used for graph-wide recall (orchestrator + CPU + user + io). */
export const GRAPH_RECALL_PREFIXES = [
  "user.session",
  "kernel.orchestrator",
  ...CPU_STEPS.map((s) => CPU_STEP_TO_ID[s]),
  "io.bus",
] as const;
