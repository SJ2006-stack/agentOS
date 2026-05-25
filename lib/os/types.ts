export const CPU_STEPS = [
  "INTAKE",
  "PLAN",
  "ROUTE",
  "DISPATCH",
  "VERIFY",
  "COMMIT",
] as const;

export type CpuStep = (typeof CPU_STEPS)[number];

export type OsChannel =
  | "os:kernel"
  | "os:cpu"
  | "os:memory"
  | "os:io"
  | "os:gpu"
  | "os:graph";

export interface GraphNodeActiveEvent {
  nodeId: string;
  taskId: string;
  active: boolean;
  step?: CpuStep;
}

export interface KernelHeartbeat {
  ts: number;
  uptimeMs: number;
  status: "online" | "degraded" | "offline";
}

export interface KernelCommandRouted {
  command: string;
  route: "cpu" | "hydradb" | "status" | "kernel";
}

export interface CpuStepEvent {
  step: CpuStep;
  status: "start" | "complete" | "running";
  taskId?: string;
  message?: string;
}

export interface CpuPipelineState {
  currentStep: CpuStep | null;
  taskId: string | null;
  completedSteps: CpuStep[];
}

export interface MemorySlotWrite {
  memoryId?: string;
  agentId: string;
  preview: string;
  status: "pending" | "indexed" | "error";
}

export interface MemoryRecallResult {
  query: string;
  chunks: { text: string; score?: number }[];
  queryPaths?: string[];
}

export interface IoToolCall {
  tool: string;
  args: Record<string, unknown>;
  layer: "fs" | "api" | "web" | "exec";
  ts: number;
}

export interface GpuDispatchPayload {
  hotZones: { x: number; y: number; heat: number }[];
  activeWorkers: number;
  taskId?: string;
}

export interface GpuWorkerTick {
  workerId: number;
  zone: { x: number; y: number };
  progress: number;
}

export interface GpuBatchComplete {
  taskId?: string;
  workersCompleted: number;
}

export interface KernelUsageTick {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
  agentId?: string;
  model?: string;
}

export type ShellCommand =
  | { type: "submit"; task: string }
  | { type: "recall"; query: string }
  | { type: "memory_stream"; query?: string }
  | { type: "show_memory" }
  | { type: "status" }
  | { type: "spawn"; count: number }
  | { type: "spawn_agent"; templateId: string }
  | { type: "list_agents" }
  | { type: "agent_status" }
  | { type: "create_agent"; name: string; role: string }
  | { type: "kill"; agentId: string }
  | { type: "unknown"; raw: string };

export function parseShellCommand(input: string): ShellCommand {
  const trimmed = input.trim();
  if (!trimmed) return { type: "unknown", raw: "" };

  const lower = trimmed.toLowerCase();
  if (lower === "show memory" || lower === "memory") {
    return { type: "show_memory" };
  }
  if (lower === "agents" || lower === "list agents") {
    return { type: "list_agents" };
  }
  if (lower === "agent status") {
    return { type: "agent_status" };
  }
  if (lower.startsWith("memory stream")) {
    const q = trimmed.slice("memory stream".length).trim();
    return { type: "memory_stream", query: q || undefined };
  }
  if (lower.startsWith("spawn agent ")) {
    const templateId = trimmed.slice("spawn agent ".length).trim();
    return templateId
      ? { type: "spawn_agent", templateId }
      : { type: "unknown", raw: trimmed };
  }

  const createMatch = trimmed.match(/^create\s+agent\s+(\S+)\s+"([^"]+)"\s*$/i);
  if (createMatch) {
    return {
      type: "create_agent",
      name: createMatch[1]!,
      role: createMatch[2]!,
    };
  }
  const createUnquoted = trimmed.match(/^create\s+agent\s+(\S+)\s+(.+)$/i);
  if (createUnquoted) {
    return {
      type: "create_agent",
      name: createUnquoted[1]!,
      role: createUnquoted[2]!.trim(),
    };
  }

  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (cmd.toLowerCase()) {
    case "submit":
      return arg ? { type: "submit", task: arg } : { type: "unknown", raw: trimmed };
    case "recall":
      return arg ? { type: "recall", query: arg } : { type: "unknown", raw: trimmed };
    case "status":
      return { type: "status" };
    case "spawn": {
      if (rest[0]?.toLowerCase() === "agent") {
        const templateId = rest.slice(1).join(" ").trim();
        return templateId
          ? { type: "spawn_agent", templateId }
          : { type: "unknown", raw: trimmed };
      }
      const n = parseInt(rest[0] ?? "1", 10);
      return { type: "spawn", count: Number.isFinite(n) ? n : 1 };
    }
    case "kill":
      return arg ? { type: "kill", agentId: arg } : { type: "unknown", raw: trimmed };
    default:
      return { type: "unknown", raw: trimmed };
  }
}

export const GRID_SIZE = 16;

export function emptyHeatmap(): number[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 0)
  );
}
