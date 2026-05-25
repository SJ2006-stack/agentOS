"use client";

import { memo } from "react";
import { PipelineTimeline } from "@/components/pipeline/PipelineTimeline";

export const CpuScheduler = memo(function CpuScheduler({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  return (
    <div className="cpu-scheduler flex h-full min-h-0 flex-col">
      {showHeader && (
        <span className="mb-2 text-left text-os-amber">
          CPU SCHEDULER
        </span>
      )}
      <PipelineTimeline />
    </div>
  );
});
