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
  displayName?: string;
  description?: string;
}

const CPU_STEP_META: Record<
  CpuStep,
  { displayName: string; description: string }
> = {
  INTAKE: {
    displayName: "Intake",
    description: "Receives routed shell input from the kernel orchestrator.",
  },
  PLAN: {
    displayName: "Planner",
    description: "Breaks the task into steps before routing to workers.",
  },
  ROUTE: {
    displayName: "Router",
    description: "Selects which CPU/GPU paths to run for the current step.",
  },
  DISPATCH: {
    displayName: "Dispatcher",
    description: "Hands work to GPU workers and triggers verification.",
  },
  VERIFY: {
    displayName: "Verifier",
    description: "Checks GPU output before the pipeline commits results.",
  },
  COMMIT: {
    displayName: "Committer",
    description: "Writes the final task summary into HydraDB memory.",
  },
};

const BUILTIN_AGENT_META: Record<
  string,
  { displayName: string; description: string }
> = {
  "user.session": {
    displayName: "User Session",
    description: "Captures shell input and links turns to kernel routing.",
  },
  "kernel.orchestrator": {
    displayName: "Orchestrator",
    description: "Kernel entry point — routes commands into the CPU pipeline.",
  },
  "gpu.worker": {
    displayName: "GPU Worker",
    description: "Parallel worker batch for hot-zone compute.",
  },
  "io.bus": {
    displayName: "I/O Bus",
    description: "Relays fs, API, web, and exec tool calls across the OS.",
  },
  [HYDRA_MEMORY_HUB_ID]: {
    displayName: "HydraDB",
    description: "Shared memory hub — all agents persist context here.",
  },
};

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
  const meta = CPU_STEP_META[step];
  return {
    id,
    subTenantId: id,
    role: `cpu.${step.toLowerCase()}`,
    systemPrompt: CPU_SYSTEM,
    edges: [...CPU_DOWNSTREAM[step], HYDRA_MEMORY_HUB_ID],
    displayName: meta.displayName,
    description: meta.description,
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
    ...BUILTIN_AGENT_META["user.session"],
  },
  "kernel.orchestrator": {
    id: "kernel.orchestrator",
    subTenantId: "kernel.orchestrator",
    role: "kernel.orchestrator",
    systemPrompt: KERNEL_SYSTEM,
    edges: ["cpu.intake", HYDRA_MEMORY_HUB_ID],
    ...BUILTIN_AGENT_META["kernel.orchestrator"],
  },
  ...CPU_GRAPH_NODES,
  "gpu.worker": {
    id: "gpu.worker",
    subTenantId: "gpu.worker",
    role: "gpu.worker",
    systemPrompt: GPU_SYSTEM,
    edges: [HYDRA_MEMORY_HUB_ID],
    ...BUILTIN_AGENT_META["gpu.worker"],
  },
  "io.bus": {
    id: "io.bus",
    subTenantId: "io.bus",
    role: "io.bus",
    systemPrompt: IO_BUS_SYSTEM,
    edges: [HYDRA_MEMORY_HUB_ID],
    ...BUILTIN_AGENT_META["io.bus"],
  },
  [HYDRA_MEMORY_HUB_ID]: {
    id: HYDRA_MEMORY_HUB_ID,
    subTenantId: "hydradb.memory",
    role: "hydradb.hub",
    systemPrompt: "HydraDB shared memory hub for the agent graph.",
    edges: [],
    ...BUILTIN_AGENT_META[HYDRA_MEMORY_HUB_ID],
  },
};

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[.-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Human-readable node label for graph UI and telemetry. */
export function getAgentDisplayName(id: string, role?: string): string {
  const builtin = AGENT_GRAPH[id];
  if (builtin?.displayName) return builtin.displayName;
  if (id.startsWith("custom.")) {
    return titleCaseSlug(id.replace(/^custom\./, ""));
  }
  if (role?.trim()) return titleCaseSlug(role.trim());
  return titleCaseSlug(id.split(".").pop() ?? id);
}

/** Short role blurb for node tooltips. */
export function getAgentDescription(id: string, role?: string): string {
  const builtin = AGENT_GRAPH[id];
  if (builtin?.description) return builtin.description;
  if (role?.trim()) return role.trim();
  return `Agent node ${id}`;
}

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
