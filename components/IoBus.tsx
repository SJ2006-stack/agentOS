"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExpandableText } from "@/components/ui/expandable-text";
import { formatIoArgs } from "@/lib/os/format-io-args";
import type { IoToolCall } from "@/lib/os/types";
import { useOsStore } from "@/store/osStore";

function IoBusEventRow({ event }: { event: IoToolCall }) {
  const argsText = formatIoArgs(event.args);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="border-b border-os-border/50 py-1"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="shrink-0 text-os-amber">[{event.layer}]</span>
        <span className="shrink-0 text-os-green">{event.tool}</span>
      </div>
      <ExpandableText text={argsText} maxLines={2} className="mt-0.5 pl-0 text-os-dim" />
    </motion.div>
  );
}

export const IoBus = memo(function IoBus({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const events = useOsStore((s) => s.io.events);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {showHeader && (
        <h2 className="mb-1 shrink-0 text-xs text-os-amber tracking-wider">I/O BUS</h2>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto font-mono text-[10px]">
        <AnimatePresence initial={false}>
          {events.length === 0 && (
            <p className="text-os-dim">awaiting tool calls…</p>
          )}
          {events.map((e, i) => (
            <IoBusEventRow key={`${e.ts}-${i}`} event={e} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});
