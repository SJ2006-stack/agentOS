"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";

interface OsEvent {
  name: string;
  description: string;
  icon: string;
  accent: string;
  time: string;
}

const baseEvents: OsEvent[] = [
  {
    name: "heartbeat",
    description: "kernel.orchestrator — tick ok",
    time: "now",
    icon: "♥",
    accent: "var(--os-green)",
  },
  {
    name: "dispatch",
    description: "cpu.dispatch → gpu.worker",
    time: "2s",
    icon: "→",
    accent: "var(--os-amber)",
  },
  {
    name: "slot_write",
    description: "hydradb.memory — cpu.plan chunk",
    time: "8s",
    icon: "▣",
    accent: "var(--os-green)",
  },
  {
    name: "graph_pulse",
    description: "agent graph — cpu.route active",
    time: "14s",
    icon: "◎",
    accent: "var(--os-dim)",
  },
  {
    name: "verify",
    description: "cpu.verify — task checksum ok",
    time: "21s",
    icon: "✓",
    accent: "var(--os-green)",
  },
];

const events = Array.from({ length: 8 }, () => baseEvents).flat();

function OsEventRow({ name, description, icon, accent, time }: OsEvent) {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[320px] overflow-hidden rounded-md border border-os-border bg-os-panel/90 p-3",
        "transition-all duration-200 ease-out hover:border-os-green/40"
      )}
    >
      <div className="flex flex-row items-center gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded border border-os-border font-mono text-sm"
          style={{ color: accent }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center gap-1 text-xs font-medium text-os-green">
            <span className="truncate">{name}</span>
            <span className="text-os-dim">·</span>
            <span className="shrink-0 text-[10px] text-os-dim">{time}</span>
          </figcaption>
          <p className="truncate text-[10px] text-os-dim">{description}</p>
        </div>
      </div>
    </figure>
  );
}

export default function AnimatedListDemo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[200px] w-full flex-col overflow-hidden p-1",
        className
      )}
    >
      <AnimatedList delay={2200} className="items-stretch gap-2">
        {events.map((item, idx) => (
          <OsEventRow {...item} key={idx} />
        ))}
      </AnimatedList>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-os-panel to-transparent" />
    </div>
  );
}
