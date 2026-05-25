"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AGENT_SPAWNED_EVENT,
  type AgentSpawnedDetail,
} from "@/lib/os/shell-events";
import { getAgentDisplayName } from "@/lib/os/agent-graph-data";
import { CPU_STEPS, type CpuStep, type IoToolCall } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

type FeedKind = "research" | "memory" | "complete" | "dispatch" | "spawn" | "fault";

interface FeedEntry {
  id: string;
  kind: FeedKind;
  icon: string;
  prefix: string;
  text: string;
  ts: number;
}

const MAX_FEED = 32;
const VISIBLE_FEED = 12;

let feedSeq = 0;
function nextFeedId(): string {
  feedSeq = (feedSeq + 1) % Number.MAX_SAFE_INTEGER;
  return `feed-${Date.now().toString(36)}-${feedSeq.toString(36)}`;
}

const KIND_STYLE: Record<FeedKind, string> = {
  research: "text-sky-300",
  memory: "text-violet-300",
  complete: "text-emerald-300",
  dispatch: "text-amber-300",
  spawn: "text-amber-300",
  fault: "text-red-300",
};

const KIND_LABEL: Record<FeedKind, string> = {
  research: "Research",
  memory: "Memory",
  complete: "Stage",
  dispatch: "Dispatch",
  spawn: "Spawn",
  fault: "Fault",
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function shortenText(text: string, maxLen = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function humanizeToolName(tool: string): string {
  return tool.replace(/_/g, " ").replace(/\./g, " · ");
}

function describeIoCall(event: IoToolCall): string {
  const layerLabel =
    event.layer === "exec"
      ? "executing"
      : event.layer === "fs"
        ? "reading files"
        : "researching";
  const argValues = Object.values(event.args ?? {}).filter(
    (v) => typeof v === "string" || typeof v === "number"
  );
  const detail =
    typeof argValues[0] === "string"
      ? argValues[0]
      : typeof argValues[0] === "number"
        ? String(argValues[0])
        : null;
  const toolLabel = humanizeToolName(event.tool);
  if (detail) {
    return shortenText(`${layerLabel} — ${toolLabel}: ${detail}`, 88);
  }
  return shortenText(`${layerLabel} — ${toolLabel}`, 80);
}

function ioKindFor(event: IoToolCall): FeedKind {
  if (event.layer === "exec") return "dispatch";
  if (event.layer === "fs") return "memory";
  return "research";
}

function ioIconFor(kind: FeedKind): string {
  switch (kind) {
    case "research":
      return "🔍";
    case "memory":
      return "🧠";
    case "complete":
      return "✅";
    case "dispatch":
      return "🚀";
    case "spawn":
      return "⚡";
    case "fault":
      return "⚠️";
  }
}

function eventKeyForIo(event: IoToolCall): string {
  return `io:${event.ts}:${event.layer}:${event.tool}`;
}

const STAGE_VERB: Record<CpuStep, string> = {
  INTAKE: "intake",
  PLAN: "plan",
  ROUTE: "route",
  DISPATCH: "dispatch",
  VERIFY: "verify",
  COMMIT: "commit",
};

export const WorkspaceAgentFeed = memo(function WorkspaceAgentFeed() {
  const ioEvents = useOsStore((s) => s.io.events);
  const memorySlots = useOsStore((s) => s.memory.slots);
  const completedSteps = useOsStore((s) => s.cpu.pipeline.completedSteps);
  const dispatchSeq = useOsStore((s) => s.gpu.dispatchSeq);
  const lastDispatchWorkers = useOsStore(
    (s) => s.gpu.lastDispatch?.activeWorkers ?? 0
  );
  const heartbeatStatus = useOsStore((s) => s.kernel.heartbeat?.status ?? null);

  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const lastIoKeyRef = useRef<string | null>(null);
  const lastMemoryKeyRef = useRef<string | null>(null);
  const lastCpuLenRef = useRef<number>(0);
  const lastDispatchSeqRef = useRef<number>(0);
  const lastHeartbeatStatusRef = useRef<string | null>(null);
  const initialisedRef = useRef(false);

  const push = (entries: FeedEntry[]) => {
    if (entries.length === 0) return;
    setFeed((prev) => [...entries.reverse(), ...prev].slice(0, MAX_FEED));
  };

  useEffect(() => {
    if (ioEvents.length === 0) return;
    const newest = ioEvents[0];
    const head = eventKeyForIo(newest);
    const lastSeen = lastIoKeyRef.current;
    lastIoKeyRef.current = head;
    if (!initialisedRef.current) return;

    const fresh: FeedEntry[] = [];
    for (const event of ioEvents) {
      const key = eventKeyForIo(event);
      if (key === lastSeen) break;
      const kind = ioKindFor(event);
      fresh.push({
        id: nextFeedId(),
        kind,
        icon: ioIconFor(kind),
        prefix: KIND_LABEL[kind],
        text: describeIoCall(event),
        ts: event.ts || Date.now(),
      });
    }
    push(fresh);
  }, [ioEvents]);

  useEffect(() => {
    if (memorySlots.length === 0) return;
    const head = memorySlots[0];
    const headKey = `${head.memoryId ?? ""}|${head.agentId}|${head.status}|${(head.preview ?? "").slice(0, 32)}`;
    const lastSeen = lastMemoryKeyRef.current;
    lastMemoryKeyRef.current = headKey;
    if (!initialisedRef.current) return;

    const fresh: FeedEntry[] = [];
    for (const slot of memorySlots) {
      const key = `${slot.memoryId ?? ""}|${slot.agentId}|${slot.status}|${(slot.preview ?? "").slice(0, 32)}`;
      if (key === lastSeen) break;
      if (slot.status === "error") {
        fresh.push({
          id: nextFeedId(),
          kind: "fault",
          icon: ioIconFor("fault"),
          prefix: KIND_LABEL.fault,
          text: shortenText(`${slot.agentId} could not index memory`, 80),
          ts: Date.now(),
        });
      } else {
        const agentLabel = slot.agentId.split(".").pop() ?? slot.agentId;
        fresh.push({
          id: nextFeedId(),
          kind: "memory",
          icon: ioIconFor("memory"),
          prefix: KIND_LABEL.memory,
          text: shortenText(
            `${agentLabel} remembered ${slot.preview ?? "memory"}`,
            90
          ),
          ts: Date.now(),
        });
      }
    }
    push(fresh);
  }, [memorySlots]);

  useEffect(() => {
    const prev = lastCpuLenRef.current;
    lastCpuLenRef.current = completedSteps.length;
    if (!initialisedRef.current) return;
    if (completedSteps.length <= prev) return;

    const newlyDone = completedSteps.slice(prev);
    const fresh: FeedEntry[] = newlyDone.map((step) => {
      const next = nextStepLabel(step);
      return {
        id: nextFeedId(),
        kind: "complete",
        icon: ioIconFor("complete"),
        prefix: KIND_LABEL.complete,
        text: next
          ? `Pipeline: ${STAGE_VERB[step]} → ${next}`
          : `Pipeline: ${STAGE_VERB[step]} complete`,
        ts: Date.now(),
      };
    });
    push(fresh);
  }, [completedSteps]);

  useEffect(() => {
    const prev = lastDispatchSeqRef.current;
    lastDispatchSeqRef.current = dispatchSeq;
    if (!initialisedRef.current) return;
    if (dispatchSeq <= prev) return;

    push([
      {
        id: nextFeedId(),
        kind: "dispatch",
        icon: ioIconFor("dispatch"),
        prefix: KIND_LABEL.dispatch,
        text: `${lastDispatchWorkers} worker${lastDispatchWorkers === 1 ? "" : "s"} spawned`,
        ts: Date.now(),
      },
    ]);
  }, [dispatchSeq, lastDispatchWorkers]);

  useEffect(() => {
    const prev = lastHeartbeatStatusRef.current;
    lastHeartbeatStatusRef.current = heartbeatStatus;
    if (!initialisedRef.current) return;
    if (heartbeatStatus === prev) return;
    if (heartbeatStatus === "degraded" || heartbeatStatus === "offline") {
      push([
        {
          id: nextFeedId(),
          kind: "fault",
          icon: ioIconFor("fault"),
          prefix: KIND_LABEL.fault,
          text: `kernel ${heartbeatStatus}`,
          ts: Date.now(),
        },
      ]);
    }
  }, [heartbeatStatus]);

  useEffect(() => {
    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<AgentSpawnedDetail>).detail;
      const templateId = detail?.templateId;
      if (!templateId) return;
      if (!initialisedRef.current) return;
      const label = getAgentDisplayName(templateId, detail.role);
      push([
        {
          id: nextFeedId(),
          kind: "spawn",
          icon: ioIconFor("spawn"),
          prefix: KIND_LABEL.spawn,
          text: `${label} joined the graph — watch edges light up`,
          ts: Date.now(),
        },
      ]);
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onSpawn);
    return () => window.removeEventListener(AGENT_SPAWNED_EVENT, onSpawn);
  }, []);

  useEffect(() => {
    initialisedRef.current = true;
  }, []);

  const visible = feed.slice(0, VISIBLE_FEED);

  return (
    <section
      aria-label="Agent feed"
      className="workspace-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-left text-os-dim">
          Agent Feed
        </span>
        <span className="text-left text-os-dim">
          {feed.length === 0 ? "idle" : String(feed.length)}
        </span>
      </header>

      <ul
        className="min-h-0 flex-1 list-none space-y-2 overflow-y-auto px-3 py-3"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {visible.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center text-[11px] text-os-dim"
            >
              <span className="text-center text-os-dim">
                Waiting for agent activity…
              </span>
            </motion.li>
          )}
          {visible.map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "workspace-feed-row flex flex-wrap items-start gap-x-2.5 gap-y-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2",
                entry.kind === "spawn" && "workspace-feed-row--spawn"
              )}
            >
              <span aria-hidden className="shrink-0 text-[13px] leading-none">
                {entry.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px] leading-snug">
                  <span className={cn("inline text-left", KIND_STYLE[entry.kind])}>
                    {`${entry.prefix}:`}
                  </span>
                  <span className="break-words text-os-green/90">
                    {entry.text}
                  </span>
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-os-dim/80">
                {formatTimestamp(entry.ts)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
});

function nextStepLabel(step: CpuStep): string | null {
  const idx = CPU_STEPS.indexOf(step);
  if (idx < 0 || idx >= CPU_STEPS.length - 1) return null;
  return CPU_STEPS[idx + 1];
}
