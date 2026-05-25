"use client";

import { DEFAULT_OPENROUTER_MODEL_ID } from "@/lib/ai/models-client";

export const MODEL_CHANGE_EVENT = "devfactory:model-change";

export function ConfigurePanel() {
  return (
    <div className="flex h-full min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-left text-os-amber">
          CONFIGURE
        </span>
        <span className="text-left text-os-dim">
          OpenRouter
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[10px] text-os-dim">Model</span>
        <p
          className="rounded border border-os-border bg-os-panel px-3 py-2 font-mono text-[11px] text-os-green"
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
