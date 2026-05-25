"use client";

import { motion } from "motion/react";
import { useOsStore } from "@/store/osStore";

export function HydraMemoryPanel() {
  const { memory, hydraConfigured } = useOsStore();

  if (!hydraConfigured) {
    return (
      <div className="flex h-full flex-col">
        <h2 className="mb-2 text-xs text-os-amber tracking-wider">HYDRA MEMORY</h2>
        <p className="text-[10px] text-os-fault">
          HYDRADB_API_KEY missing — set in .env.local
        </p>
        <p className="mt-1 text-[10px] text-os-dim">
          Run: submit &lt;task&gt; after configuring HydraDB
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <h2 className="mb-2 text-xs text-os-amber tracking-wider">HYDRA MEMORY</h2>
      <div className="min-h-0 flex-1 overflow-y-auto space-y-1">
        {memory.slots.length === 0 && (
          <p className="text-[10px] text-os-dim">No memory slots yet</p>
        )}
        {memory.slots.map((slot, i) => (
          <motion.div
            key={`${slot.agentId}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded border border-os-border px-2 py-1 text-[10px]"
          >
            <span
              className={
                slot.status === "indexed"
                  ? "text-os-green"
                  : slot.status === "pending"
                    ? "text-os-amber"
                    : "text-os-fault"
              }
            >
              [{slot.status}]
            </span>{" "}
            <span className="text-os-dim">{slot.agentId}</span>
            <p className="truncate text-os-green/70">{slot.preview}</p>
          </motion.div>
        ))}
      </div>
      {memory.lastRecall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 border-t border-os-border pt-2 text-[10px]"
        >
          <p className="text-os-amber">recall: {memory.lastRecall.query}</p>
          {memory.lastRecall.chunks.slice(0, 2).map((c, i) => (
            <p key={i} className="truncate text-os-dim">
              {c.text.slice(0, 60)}
            </p>
          ))}
          {memory.lastRecall.queryPaths && memory.lastRecall.queryPaths.length > 0 && (
            <p className="text-os-dim mt-1">
              paths: {memory.lastRecall.queryPaths.slice(0, 2).join(" → ")}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
