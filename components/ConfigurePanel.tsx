"use client";

import { OPENROUTER_MODELS, openRouterModelById } from "@/lib/ai/models-client";
import { useOsStore } from "@/store/osStore";

export const MODEL_CHANGE_EVENT = "devfactory:model-change";

export function ConfigurePanel() {
  const { selectedModelId, setSelectedModelId } = useOsStore();
  const active = openRouterModelById(selectedModelId);

  const onModelChange = (id: string) => {
    setSelectedModelId(id);
    const label = openRouterModelById(id)?.label ?? id;
    window.dispatchEvent(
      new CustomEvent(MODEL_CHANGE_EVENT, {
        detail: { id, label },
      })
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs tracking-wider text-os-amber">CONFIGURE</h2>
        <span className="text-[10px] uppercase tracking-wider text-os-dim">
          OpenRouter
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-os-dim">Model</span>
        <select
          value={selectedModelId}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full rounded border border-os-border bg-os-panel px-2 py-1.5 text-[11px] text-os-green focus:border-os-amber/50 focus:outline-none"
          title={selectedModelId}
        >
          {OPENROUTER_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label}
              {model.free ? " (free)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="truncate text-[10px] text-os-green/80">
        active: {active?.label ?? selectedModelId}
        {active?.free ? " (free)" : ""}
        <span className="text-os-dim"> · {selectedModelId}</span>
      </p>
    </div>
  );
}
