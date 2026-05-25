"use client";

import type { UiMode } from "@/store/uiModeStore";
import { cn } from "@/lib/utils";

const PREVIEW_COPY: Record<UiMode, { tag: string; hint: string }> = {
  hero: { tag: "intro", hint: "Telemetry · graph · enter OS" },
  terminal: { tag: "monitor", hint: "Full shell · collapsed panels" },
  desktop: { tag: "aurora", hint: "Glass windows · desktop icons" },
  workspace: { tag: "mission", hint: "Graph · task · memory · GPU" },
};

function MiniPanels({ mode }: { mode: UiMode }) {
  if (mode === "terminal") {
    return (
      <div className="grid h-full grid-rows-[1fr_0.35fr] gap-0.5 p-1">
        <div className="rounded-sm border border-os-green/25 bg-os-bg/90 p-0.5">
          <div className="h-full rounded-sm bg-os-green/10">
            <div className="mx-1 mt-0.5 h-0.5 w-6 rounded-full bg-os-green/50" />
            <div className="mx-1 mt-0.5 h-0.5 w-10 rounded-full bg-os-green/30" />
            <div className="mx-1 mt-0.5 h-0.5 w-4 rounded-full bg-os-amber/40" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0.5">
          {["cpu", "gpu", "mem"].map((k) => (
            <div
              key={k}
              className="rounded-sm border border-os-border/50 bg-os-panel/60"
              title={k}
            />
          ))}
        </div>
      </div>
    );
  }

  if (mode === "desktop") {
    return (
      <div className="relative h-full overflow-hidden rounded-sm bg-gradient-to-br from-sky-900/40 via-violet-900/30 to-emerald-900/30 p-1">
        <div className="absolute left-1 top-1 h-3 w-4 rounded-sm border border-white/20 bg-white/10 backdrop-blur-sm" />
        <div className="absolute right-1 top-2 h-2.5 w-3 rounded-sm border border-white/15 bg-white/10" />
        <div className="absolute bottom-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-black/30" />
      </div>
    );
  }

  if (mode === "workspace") {
    return (
      <div className="grid h-full grid-cols-4 grid-rows-2 gap-0.5 p-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-sm border border-os-border/40",
              i === 0 && "border-os-green/40 bg-os-green/15",
              i === 4 && "border-os-amber/30 bg-os-amber/10",
              i !== 0 && i !== 4 && "bg-os-panel/50"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-0.5 p-1">
      <div className="h-4 w-4 rounded-full border border-os-amber/40 bg-os-amber/10" />
      <div className="h-0.5 w-10 rounded-full bg-os-border/60" />
      <div className="h-0.5 w-6 rounded-full bg-os-green/30" />
    </div>
  );
}

export function DockModePreview({ mode }: { mode: UiMode }) {
  const { tag, hint } = PREVIEW_COPY[mode];

  return (
    <div className="w-[168px] overflow-hidden rounded-md border border-os-border/50 bg-os-panel/95 shadow-lg">
      <div className="flex items-center justify-between border-b border-os-border/50 px-2 py-1">
        <span className="text-[9px] font-medium uppercase tracking-wider text-os-amber">
          {tag}
        </span>
        <span className="size-1.5 rounded-full bg-os-green/80 shadow-[0_0_4px_var(--os-green)]" />
      </div>
      <div className="mx-2 my-1.5 h-[52px] overflow-hidden rounded border border-os-border/40 bg-os-bg/90">
        <MiniPanels mode={mode} />
      </div>
      <p className="px-2 pb-1.5 text-[9px] leading-snug text-os-dim">{hint}</p>
    </div>
  );
}
