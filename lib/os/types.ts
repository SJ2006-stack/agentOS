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
  | "os:gpu";

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

export type ShellCommand =
  | { type: "submit"; task: string }
  | { type: "recall"; query: string }
  | { type: "memory_stream"; query?: string }
  | { type: "show_memory" }
  | { type: "status" }
  | { type: "spawn"; count: number }
  | { type: "kill"; agentId: string }
  | { type: "unknown"; raw: string };

export function parseShellCommand(input: string): ShellCommand {
  const trimmed = input.trim();
  if (!trimmed) return { type: "unknown", raw: "" };

  const lower = trimmed.toLowerCase();
  if (lower === "show memory" || lower === "memory") {
    return { type: "show_memory" };
  }
  if (lower.startsWith("memory stream")) {
    const q = trimmed.slice("memory stream".length).trim();
    return { type: "memory_stream", query: q || undefined };
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
