import "server-only";
import { broadcastOsEvent } from "@/lib/supabase/broadcast";
import { templateIdForCpuStep } from "@/lib/os/agent-graph-data";
import type { CpuStep } from "@/lib/os/types";

export async function broadcastGraphNodeActive(input: {
  nodeId: string;
  taskId?: string;
  step?: CpuStep;
}): Promise<void> {
  const nodeId =
    input.step != null ? templateIdForCpuStep(input.step) : input.nodeId;
  await broadcastOsEvent("os:graph", "node_active", {
    nodeId,
    taskId: input.taskId ?? "",
    active: true,
    step: input.step,
  });
}
