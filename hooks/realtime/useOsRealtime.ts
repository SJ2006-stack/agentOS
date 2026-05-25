"use client";

import { useEffect } from "react";
import { getSupabaseBrowser, isSupabaseConfiguredClient } from "@/lib/supabase/client";
import type {
  CpuStep,
  GpuDispatchPayload,
  IoToolCall,
  KernelHeartbeat,
  KernelUsageTick,
  MemoryRecallResult,
  MemorySlotWrite,
} from "@/lib/os/types";
import { useOsStore, type RealtimeBatch } from "@/store/os/osStore";

const REALTIME_FLUSH_MS = 100;

function mergeBatch(target: RealtimeBatch, patch: RealtimeBatch): void {
  if (patch.kernelHeartbeat !== undefined) target.kernelHeartbeat = patch.kernelHeartbeat;
  if (patch.kernelCommand !== undefined) target.kernelCommand = patch.kernelCommand;
  if (patch.kernelUsage !== undefined) target.kernelUsage = patch.kernelUsage;
  if (patch.kernelConnected !== undefined) target.kernelConnected = patch.kernelConnected;
  if (patch.cpuStep) target.cpuStep = patch.cpuStep;
  if (patch.cpuPipeline) {
    target.cpuPipeline = { ...target.cpuPipeline, ...patch.cpuPipeline };
  }
  if (patch.memorySlots?.length) {
    target.memorySlots = [...(target.memorySlots ?? []), ...patch.memorySlots];
  }
  if (patch.memoryRecall !== undefined) target.memoryRecall = patch.memoryRecall;
  if (patch.ioEvents?.length) {
    target.ioEvents = [...(target.ioEvents ?? []), ...patch.ioEvents];
  }
  if (patch.gpuDispatch) target.gpuDispatch = patch.gpuDispatch;
  if (patch.gpuHeatUpdates?.length) {
    target.gpuHeatUpdates = [
      ...(target.gpuHeatUpdates ?? []),
      ...patch.gpuHeatUpdates,
    ];
  }
  if (patch.gpuWorkers !== undefined) target.gpuWorkers = patch.gpuWorkers;
  if (patch.graphNodeActive?.length) {
    target.graphNodeActive = [
      ...(target.graphNodeActive ?? []),
      ...patch.graphNodeActive,
    ];
  }
}

function createRealtimeFlusher() {
  let pending: RealtimeBatch = {};
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (!Object.keys(pending).length) return;
    const snap = pending;
    pending = {};
    useOsStore.getState().applyRealtimeBatch(snap);
  };

  return (patch: RealtimeBatch) => {
    mergeBatch(pending, patch);
    if (!timer) {
      timer = setTimeout(flush, REALTIME_FLUSH_MS);
    }
  };
}

export function useOsRealtime(hydraConfigured: boolean) {
  useEffect(() => {
    const { setConfigFlags, setMemoryConnected } = useOsStore.getState();
    setConfigFlags(hydraConfigured, isSupabaseConfiguredClient());
    setMemoryConnected(hydraConfigured);
  }, [hydraConfigured]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      useOsStore.getState().setKernelConnected(false);
      return;
    }

    const queue = createRealtimeFlusher();

    const channels = [
      {
        name: "os:kernel",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "heartbeat" || event === "uptime") {
            queue({
              kernelHeartbeat: payload as unknown as KernelHeartbeat,
            });
          }
          if (event === "command_routed") {
            queue({
              kernelCommand: String(
                (payload as { command?: string }).command ?? ""
              ),
            });
          }
          if (event === "usage_tick") {
            queue({ kernelUsage: payload as unknown as KernelUsageTick });
          }
        },
      },
      {
        name: "os:memory",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "slot_write" || event === "indexing") {
            queue({
              memorySlots: [payload as unknown as MemorySlotWrite],
            });
          }
          if (event === "recall_result") {
            queue({
              memoryRecall: payload as unknown as MemoryRecallResult,
            });
          }
        },
      },
      {
        name: "os:io",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "tool_call") {
            queue({ ioEvents: [payload as unknown as IoToolCall] });
          }
        },
      },
      {
        name: "os:cpu",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "node_active") {
            const p = payload as {
              nodeId?: string;
              taskId?: string;
              active?: boolean;
            };
            if (p.nodeId) {
              queue({
                graphNodeActive: [
                  {
                    nodeId: p.nodeId,
                    taskId: String(p.taskId ?? ""),
                    active: p.active !== false,
                  },
                ],
              });
            }
            return;
          }
          if (event === "step_start" || event === "step_complete") {
            const step = (payload as { step?: CpuStep }).step;
            const status =
              event === "step_start"
                ? ("running" as const)
                : ("complete" as const);
            if (step) {
              queue({
                cpuStep: {
                  step,
                  status,
                  message: String(
                    (payload as { message?: string }).message ?? ""
                  ),
                },
              });
            }
          }
          if (event === "pipeline_state") {
            queue({
              cpuPipeline: payload as RealtimeBatch["cpuPipeline"],
            });
          }
        },
      },
      {
        name: "os:graph",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "node_active") {
            const p = payload as {
              nodeId?: string;
              taskId?: string;
              active?: boolean;
            };
            if (p.nodeId) {
              queue({
                graphNodeActive: [
                  {
                    nodeId: p.nodeId,
                    taskId: String(p.taskId ?? ""),
                    active: p.active !== false,
                  },
                ],
              });
            }
          }
        },
      },
      {
        name: "os:gpu",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "dispatch") {
            queue({
              gpuDispatch: payload as unknown as GpuDispatchPayload,
            });
          }
          if (event === "worker_tick") {
            const p = payload as { zone?: { x: number; y: number }; progress?: number };
            if (p.zone) {
              queue({
                gpuHeatUpdates: [
                  { x: p.zone.x, y: p.zone.y, heat: p.progress ?? 0.5 },
                ],
              });
            }
          }
          if (event === "batch_complete") {
            queue({
              gpuWorkers: Number(
                (payload as { workersCompleted?: number }).workersCompleted ?? 0
              ),
            });
          }
        },
      },
    ];

    const subs = channels.map(({ name, handler }) => {
      const ch = supabase.channel(name);
      ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
        handler(event, (payload ?? {}) as Record<string, unknown>);
      });
      ch.subscribe((status) => {
        if (name === "os:kernel" && status === "SUBSCRIBED") {
          useOsStore.getState().setKernelConnected(true);
        }
      });
      return ch;
    });

    return () => {
      subs.forEach((ch) => supabase.removeChannel(ch));
      useOsStore.getState().setKernelConnected(false);
    };
  }, []);
}
