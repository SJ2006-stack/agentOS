"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useOsStore } from "@/store/osStore";

export const IoBus = memo(function IoBus({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const events = useOsStore((s) => s.io.events);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {showHeader && (
        <h2 className="mb-1 text-xs text-os-amber tracking-wider">I/O BUS</h2>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto font-mono text-[10px]">
        <AnimatePresence initial={false}>
          {events.length === 0 && (
            <p className="text-os-dim">awaiting tool calls…</p>
          )}
          {events.map((e, i) => (
            <motion.div
              key={`${e.ts}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 border-b border-os-border/50 py-0.5"
            >
              <span className="text-os-amber w-8 shrink-0">[{e.layer}]</span>
              <span className="text-os-green shrink-0">{e.tool}</span>
              <span className="text-os-dim truncate">
                {JSON.stringify(e.args).slice(0, 80)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
