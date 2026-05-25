"use client";

import { useEffect } from "react";
import { getSupabaseBrowser, isSupabaseConfiguredClient } from "@/lib/supabase/client";
import type {
  CpuStep,
  GraphNodeActiveEvent,
  GpuDispatchPayload,
  IoToolCall,
  KernelHeartbeat,
  KernelUsageTick,
  MemoryRecallResult,
  MemorySlotWrite,
} from "@/lib/os/types";
import { useOsStore } from "@/store/osStore";

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

    const channels = [
      {
        name: "os:kernel",
        handler: (event: string, payload: Record<string, unknown>) => {
          const s = useOsStore.getState();
          if (event === "heartbeat" || event === "uptime") {
            s.setKernelHeartbeat(payload as unknown as KernelHeartbeat);
          }
          if (event === "command_routed") {
            s.setKernelCommand(
              String((payload as { command?: string }).command ?? "")
            );
          }
          if (event === "usage_tick") {
            s.setKernelUsage(payload as unknown as KernelUsageTick);
          }
        },
      },
      {
        name: "os:memory",
        handler: (event: string, payload: Record<string, unknown>) => {
          const s = useOsStore.getState();
          if (event === "slot_write" || event === "indexing") {
            s.addMemorySlot(payload as unknown as MemorySlotWrite);
          }
          if (event === "recall_result") {
            s.setMemoryRecall(payload as unknown as MemoryRecallResult);
          }
        },
      },
      {
        name: "os:io",
        handler: (event: string, payload: Record<string, unknown>) => {
          if (event === "tool_call") {
            useOsStore.getState().pushIoEvent(payload as unknown as IoToolCall);
          }
        },
      },
      {
        name: "os:cpu",
        handler: (event: string, payload: Record<string, unknown>) => {
          const s = useOsStore.getState();
          if (event === "node_active") {
            const p = payload as {
              nodeId?: string;
              taskId?: string;
              active?: boolean;
            };
            if (p.nodeId) {
              s.setGraphNodeActive({
                nodeId: p.nodeId,
                taskId: String(p.taskId ?? ""),
                active: p.active !== false,
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
              s.setCpuStep(
                step,
                status,
                String((payload as { message?: string }).message ?? "")
              );
            }
          }
          if (event === "pipeline_state") {
            s.setCpuPipeline(payload as Parameters<typeof s.setCpuPipeline>[0]);
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
              useOsStore.getState().setGraphNodeActive({
                nodeId: p.nodeId,
                taskId: String(p.taskId ?? ""),
                active: p.active !== false,
              });
            }
          }
        },
      },
      {
        name: "os:gpu",
        handler: (event: string, payload: Record<string, unknown>) => {
          const s = useOsStore.getState();
          if (event === "dispatch") {
            s.setGpuDispatch(payload as unknown as GpuDispatchPayload);
          }
          if (event === "worker_tick") {
            const p = payload as { zone?: { x: number; y: number }; progress?: number };
            if (p.zone) {
              s.updateGpuHeat(p.zone.x, p.zone.y, p.progress ?? 0.5);
            }
          }
          if (event === "batch_complete") {
            s.setGpuWorkers(
              Number((payload as { workersCompleted?: number }).workersCompleted ?? 0)
            );
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
