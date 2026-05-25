"use client";

import { cn } from "@/lib/utils";

type OsPanelSkeletonVariant = "block" | "graph" | "feed" | "list";

interface OsPanelSkeletonProps {
  variant?: OsPanelSkeletonVariant;
  rows?: number;
  className?: string;
}

function SkeletonBar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded border border-os-border/40 bg-os-panel/30",
        className
      )}
      style={style}
    />
  );
}

export function OsPanelSkeleton({
  variant = "block",
  rows = 3,
  className,
}: OsPanelSkeletonProps) {
  if (variant === "graph") {
    return (
      <div
        className={cn(
          "flex h-full min-h-[200px] flex-col gap-3 rounded-lg border border-os-border/50 bg-os-panel/20 p-4",
          className
        )}
        aria-hidden
      >
        <div className="flex items-center justify-between gap-3">
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="h-3 w-16" />
        </div>
        <div className="relative min-h-0 flex-1">
          <SkeletonBar className="absolute left-[18%] top-[22%] h-5 w-10 rounded-full" />
          <SkeletonBar className="absolute left-[44%] top-[38%] h-5 w-10 rounded-full" />
          <SkeletonBar className="absolute left-[68%] top-[24%] h-5 w-10 rounded-full" />
          <SkeletonBar className="absolute left-[52%] top-[62%] h-5 w-10 rounded-full" />
          <SkeletonBar className="absolute inset-x-[12%] top-[34%] h-px opacity-60" />
          <SkeletonBar className="absolute inset-x-[24%] top-[52%] h-px opacity-60" />
        </div>
        <SkeletonBar className="h-3 w-40" />
      </div>
    );
  }

  if (variant === "feed" || variant === "list") {
    return (
      <div
        className={cn("flex flex-col gap-2", className)}
        aria-hidden
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg border border-os-border/40 bg-os-panel/20 px-3 py-2.5"
          >
            <SkeletonBar className="h-3 w-3 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkeletonBar className="h-2.5 w-16" />
              <SkeletonBar
                className="h-2.5"
                style={{ width: `${68 - i * 8}%` }}
              />
            </div>
            <SkeletonBar className="h-2.5 w-10 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "h-full min-h-[120px] animate-pulse rounded-lg border border-os-border/50 bg-os-panel/20",
        className
      )}
      aria-hidden
    />
  );
}
