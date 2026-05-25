"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeroGraphMini } from "@/components/hero/HeroGraphMini";
import { cn } from "@/lib/utils";

const CYCLE_MS = 30_000;
const TICK_MS = 250;

type DemoPhase = "boot" | "command" | "spawn" | "stream" | "idle";

const PHASE_AT_MS: { phase: DemoPhase; at: number }[] = [
  { phase: "boot", at: 0 },
  { phase: "command", at: 4000 },
  { phase: "spawn", at: 9000 },
  { phase: "stream", at: 14000 },
  { phase: "idle", at: 24000 },
];

const STREAM_LINES = [
  "[cpu.plan] intake · parsing task scope",
  "[cpu.plan] route → gpu.worker",
  "[gpu.worker] executing · tool calls",
  "[kernel] agent active · cpu.plan",
] as const;

function phaseAt(elapsed: number): DemoPhase {
  let current: DemoPhase = "boot";
  for (const step of PHASE_AT_MS) {
    if (elapsed >= step.at) current = step.phase;
  }
  return current;
}

export function AgentRunDemo({ className }: { className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed((performance.now() - start) % CYCLE_MS);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const phase = useMemo(() => phaseAt(elapsed), [elapsed]);
  const streamCount = useMemo(
    () =>
      phase === "stream" || phase === "idle"
        ? Math.min(
            STREAM_LINES.length,
            Math.floor(Math.max(0, elapsed - 14000) / 1800) + 1
          )
        : 0,
    [phase, elapsed]
  );
  const countdownSec = useMemo(
    () => Math.max(0, Math.ceil((CYCLE_MS - elapsed) / 1000)),
    [elapsed]
  );

  const showCursor = phase === "command" || phase === "boot";
  const typedCommand =
    phase === "boot"
      ? ""
      : phase === "command"
        ? "spawn agent cpu.plan".slice(
            0,
            Math.min(20, Math.floor(Math.max(0, elapsed - 4000) / 120) + 1)
          )
        : "spawn agent cpu.plan";

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-xl border border-hero-graphite/80 bg-hero-obsidian/90 shadow-2xl shadow-hero-cyan/5 backdrop-blur-sm",
        className
      )}
      aria-label="Demo: agent spawning and running in terminal"
    >
      <div className="hero-gradient-bg opacity-50" aria-hidden />
      <div className="hero-particles hero-particles-lite opacity-60" aria-hidden />

      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-hero-graphite/60 px-3 py-2">
        <span className="size-2 rounded-full bg-hero-crimson/80" aria-hidden />
        <span className="size-2 rounded-full bg-hero-purple/70" aria-hidden />
        <span className="size-2 rounded-full bg-hero-cyan/80" aria-hidden />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-hero-muted">
          devfactory · live
        </span>
        <span className="ml-auto font-mono text-[10px] text-hero-cyan/70">
          {countdownSec}s loop
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-10 flex flex-col flex-wrap md:flex-row">
        <div className="relative min-h-0 flex-1 overflow-hidden p-3 font-mono text-[11px] leading-relaxed sm:p-4 sm:text-xs">
          {(phase === "boot" || elapsed < 4000) && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-hero-muted"
            >
              &gt; Initializing AgentOS…
            </motion.p>
          )}
          {elapsed >= 1800 && phase === "boot" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-hero-purple/90"
            >
              &gt; Orchestration graph online
            </motion.p>
          )}
          {elapsed >= 2800 && (
            <p className="text-hero-cyan/90">
              <span className="text-hero-muted">$ </span>
              {typedCommand}
              {showCursor && (
                <span className="ml-px inline-block h-[1em] w-[0.45em] animate-pulse bg-hero-cyan/80 align-middle" />
              )}
            </p>
          )}
          {(phase === "spawn" || phase === "stream" || phase === "idle") && (
            <>
              <motion.p
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-2 text-hero-cyan"
              >
                [kernel] spawn cpu.plan…
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-hero-purple/90"
              >
                [agent] spawning cpu.plan · planner
              </motion.p>
            </>
          )}
          <div className="mt-2 space-y-1">
            {STREAM_LINES.slice(0, streamCount).map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  i === streamCount - 1 ? "text-hero-cyan" : "text-hero-muted/90"
                )}
              >
                {line}
              </motion.p>
            ))}
          </div>
          <AnimatePresence>
            {(phase === "spawn" || phase === "stream") && (
              <motion.p
                key="flash"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-4 top-1/3 text-center text-[10px] uppercase tracking-[0.35em] text-hero-cyan/90 sm:text-xs"
              >
                spawn · plan
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="relative hidden w-[42%] border-l border-hero-graphite/50 p-3 md:block">
          <p className="mb-2 text-[9px] uppercase tracking-[0.28em] text-hero-purple/80">
            Agent graph
          </p>
          <div
            className={cn(
              "h-[calc(100%-1.25rem)] transition-opacity duration-700",
              phase === "spawn" || phase === "stream" || phase === "idle"
                ? "opacity-100"
                : "opacity-40"
            )}
          >
            <HeroGraphMini className="h-full w-full" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-hero-obsidian to-transparent" />
    </div>
  );
}
