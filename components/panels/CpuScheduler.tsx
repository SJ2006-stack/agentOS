"use client";

import { memo } from "react";
import { ComicText } from "@/components/ui/comic-text";
import { PipelineTimeline } from "@/components/pipeline/PipelineTimeline";

export const CpuScheduler = memo(function CpuScheduler({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  return (
    <div className="cpu-scheduler flex h-full min-h-0 flex-col">
      {showHeader && (
        <ComicText fontSize={1.5} className="mb-2 text-left text-os-amber">
          CPU SCHEDULER
        </ComicText>
      )}
      <PipelineTimeline />
    </div>
  );
});
