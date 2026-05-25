"use client";

import { memo, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ExpandableText,
  formatMemoryPreview,
} from "@/components/ui/expandable-text";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";
import type { MemorySlotWrite } from "@/lib/os/types";

type AgentMemorySummary = {
  agentId: string;
  latest: MemorySlotWrite;
  indexedCount: number;
  isPending: boolean;
};

function isIndexingStatus(status: string): boolean {
  return status === "pending" || status === "indexing";
}

function summarizeByAgent(slots: MemorySlotWrite[]): AgentMemorySummary[] {
  const byAgent = new Map<string, AgentMemorySummary>();

  for (const slot of slots) {
    const existing = byAgent.get(slot.agentId);
    if (!existing) {
      byAgent.set(slot.agentId, {
        agentId: slot.agentId,
        latest: slot,
        indexedCount: slot.status === "indexed" ? 1 : 0,
        isPending: isIndexingStatus(slot.status),
      });
      continue;
    }
    if (slot.status === "indexed") existing.indexedCount += 1;
  }

  return [...byAgent.values()];
}

function statusTone(status: string): string {
  if (status === "indexed") return "text-os-green";
  if (isIndexingStatus(status)) return "text-os-amber";
  return "text-os-fault";
}

export const HydraMemoryPanel = memo(function HydraMemoryPanel({
  showHeader = true,
  compact = false,
}: {
  showHeader?: boolean;
  compact?: boolean;
}) {
  const memory = useOsStore((s) => s.memory);
  const hydraConfigured = useOsStore((s) => s.hydraConfigured);
  const [showDetails, setShowDetails] = useState(false);

  const { agents, totalIndexed, pendingAgents, hasRecall } = useMemo(() => {
    const agents = summarizeByAgent(memory.slots);
    const totalIndexed = agents.reduce((sum, a) => sum + a.indexedCount, 0);
    const pendingAgents = agents.filter((a) => a.isPending && a.latest.status !== "indexed");
    return {
      agents,
      totalIndexed,
      pendingAgents,
      hasRecall: Boolean(memory.lastRecall),
    };
  }, [memory.slots, memory.lastRecall]);

  const isIdle = memory.slots.length === 0 && !hasRecall;
  const isActive = totalIndexed > 0 || pendingAgents.length > 0 || hasRecall;

  if (!hydraConfigured) {
    return (
      <div className="flex h-full flex-col font-mono">
        {showHeader && (
          <h2 className="mb-2 text-xs text-os-amber tracking-wider">HYDRA MEMORY</h2>
        )}
        <p className="text-[10px] text-os-fault">
          HYDRADB_API_KEY missing — set in .env.local
        </p>
        <p className="mt-1 text-[10px] text-os-dim">
          Run: submit &lt;task&gt; after configuring HydraDB
        </p>
      </div>
    );
  }

  const summaryLine = (() => {
    if (isIdle) return "Memory ready";
    if (pendingAgents.length > 0 && totalIndexed === 0) {
      return `Indexing ${pendingAgents.length} agent insight${pendingAgents.length === 1 ? "" : "s"}…`;
    }
    if (totalIndexed > 0) {
      const insightWord = totalIndexed === 1 ? "insight" : "insights";
      return `Agent remembered ${totalIndexed} ${insightWord} from your task`;
    }
    if (hasRecall) return "Recalled context from memory";
    return "Memory ready";
  })();

  return (
    <div className="flex h-full flex-col overflow-hidden font-mono">
      {showHeader && (
        <h2 className="mb-2 text-xs text-os-amber tracking-wider">HYDRA MEMORY</h2>
      )}

      <div
        className={cn(
          "flex min-h-[2.5rem] flex-col justify-center",
          compact ? "gap-0.5" : "gap-1"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-[10px] leading-snug",
                isIdle ? "text-os-dim" : "text-os-green"
              )}
            >
              {summaryLine}
            </p>
            {isActive && agents.length > 0 && !showDetails && (
              <div className="mt-1 flex flex-wrap gap-1">
                {agents.slice(0, 4).map((a) => (
                  <span
                    key={a.agentId}
                    className="inline-flex items-center gap-1 rounded border border-os-border/40 px-1.5 py-0.5 text-[9px] text-os-dim"
                  >
                    <span className={statusTone(a.latest.status)} aria-hidden>
                      ●
                    </span>
                    <span className="break-all" title={a.agentId}>
                      {a.agentId.split(".").pop() ?? a.agentId}
                    </span>
                    {a.indexedCount > 1 && (
                      <span className="rounded bg-os-green/15 px-1 text-os-green">
                        ×{a.indexedCount}
                      </span>
                    )}
                  </span>
                ))}
                {agents.length > 4 && (
                  <span className="text-[9px] text-os-dim">+{agents.length - 4}</span>
                )}
              </div>
            )}
          </div>

          {memory.slots.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="shrink-0 text-[9px] uppercase tracking-wider text-os-dim transition-colors hover:text-os-green"
              aria-expanded={showDetails}
            >
              {showDetails ? "Hide" : "Details"}
            </button>
          )}
        </div>

        {hasRecall && !showDetails && memory.lastRecall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ExpandableText
              text={`recall: ${memory.lastRecall.query}`}
              maxLines={2}
              className="text-[9px] text-os-dim"
            />
          </motion.div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-0 overflow-hidden"
          >
            <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto border-t border-os-border/40 pt-1.5">
              {agents.map((a) => (
                <div
                  key={a.agentId}
                  className="rounded border border-os-border/50 px-2 py-1 text-[10px]"
                >
                  <div className="flex items-center gap-2">
                    <span className={statusTone(a.latest.status)}>
                      [{a.isPending && a.latest.status !== "indexed" ? "indexing" : a.latest.status}]
                    </span>
                    <span className="break-all text-os-dim">{a.agentId}</span>
                    {a.indexedCount > 0 && (
                      <span className="ml-auto shrink-0 rounded bg-os-green/10 px-1 text-[9px] text-os-green">
                        {a.indexedCount}
                      </span>
                    )}
                  </div>
                  {a.latest.preview && (
                    <ExpandableText
                      text={formatMemoryPreview(a.latest.preview)}
                      maxLines={2}
                      className="text-os-green/70"
                    />
                  )}
                </div>
              ))}
            </div>

            {memory.lastRecall && (
              <div className="mt-2 border-t border-os-border/40 pt-2 text-[10px]">
                <ExpandableText
                  text={`recall: ${memory.lastRecall.query}`}
                  maxLines={2}
                  className="text-os-amber"
                />
                {memory.lastRecall.chunks.slice(0, 2).map((c, i) => (
                  <ExpandableText
                    key={i}
                    text={c.text}
                    maxLines={2}
                    className="text-os-dim"
                  />
                ))}
                {memory.lastRecall.queryPaths &&
                  memory.lastRecall.queryPaths.length > 0 && (
                    <p className="mt-1 text-os-dim">
                      paths: {memory.lastRecall.queryPaths.slice(0, 2).join(" → ")}
                    </p>
                  )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
