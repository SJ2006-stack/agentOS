"use client";

import { GATEWAY_MODELS, gatewayModelById } from "@/lib/ai/models-client";
import { useOsStore } from "@/store/osStore";
import { cn } from "@/lib/utils";

export function ConfigurePanel() {
  const { selectedModelId, setSelectedModelId } = useOsStore();
  const active = gatewayModelById(selectedModelId);

  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs tracking-wider text-os-amber">CONFIGURE</h2>
        <span className="text-[10px] uppercase tracking-wider text-os-dim">
          AI Gateway
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {GATEWAY_MODELS.map((model) => {
          const isActive = model.id === selectedModelId;
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => setSelectedModelId(model.id)}
              title={model.id}
              className={cn(
                "rounded border px-2 py-1 text-[10px] transition-colors",
                isActive
                  ? "border-os-amber bg-os-amber/10 text-os-amber"
                  : "border-os-border text-os-dim hover:border-os-green/40 hover:text-os-green"
              )}
            >
              {model.label}
            </button>
          );
        })}
      </div>
      <p className="truncate text-[10px] text-os-green/80">
        active: {active?.label ?? selectedModelId}
        <span className="text-os-dim"> · {selectedModelId}</span>
      </p>
    </div>
  );
}
