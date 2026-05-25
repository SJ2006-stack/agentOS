"use client";

import { DEFAULT_OPENROUTER_MODEL_ID } from "@/lib/ai/models-client";

export const MODEL_CHANGE_EVENT = "devfactory:model-change";

export function ConfigurePanel() {
  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs tracking-wider text-os-amber">CONFIGURE</h2>
        <span className="text-[10px] uppercase tracking-wider text-os-dim">
          OpenRouter
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-os-dim">Model</span>
        <p
          className="rounded border border-os-border bg-os-panel px-2 py-1.5 font-mono text-[11px] text-os-green"
          title={DEFAULT_OPENROUTER_MODEL_ID}
        >
          {DEFAULT_OPENROUTER_MODEL_ID}
        </p>
      </div>
      <p className="truncate text-[10px] text-os-green/80">
        active: OpenRouter Free
        <span className="text-os-dim"> · {DEFAULT_OPENROUTER_MODEL_ID}</span>
      </p>
    </div>
  );
}
