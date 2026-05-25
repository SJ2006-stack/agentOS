"use client";

import { memo } from "react";
import { PipelineTimeline } from "@/components/PipelineTimeline";

export const CpuScheduler = memo(function CpuScheduler({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  return (
    <div className="cpu-scheduler flex h-full min-h-0 flex-col">
      {showHeader && (
        <h2 className="mb-2 text-xs text-os-amber tracking-wider">CPU SCHEDULER</h2>
      )}
      <PipelineTimeline />
    </div>
  );
});
