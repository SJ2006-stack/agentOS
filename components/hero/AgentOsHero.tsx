"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  AGENT_SPAWNED_EVENT,
  dispatchShellCommand,
  type AgentSpawnedDetail,
} from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";
import { type UiMode, useUiModeStore } from "@/store/ui/uiModeStore";

/* —— Strict palette per spec —— */
const PALETTE = {
  bg: "#080C14",
  surface: "#0D1520",
  accent: "#00FFB2",
  purple: "#8B5CF6",
  muted: "#1E2D3D",
  text: "#94A3B8",
} as const;

const DoomDemoModal = dynamic(
  () =>
    import("@/components/hero/doom/DoomDemoModal").then((m) => m.DoomDemoModal),
  { ssr: false }
);

const FEATURE_PILLS = [
  { icon: "⚡", label: "Multi-agent orchestration" },
  { icon: "🧠", label: "Memory fabric" },
  { icon: "⚙️", label: "Realtime execution" },
] as const;

/* ——————————————————————————————————————— */
/*  Strip variant (unchanged behavior)       */
/* ——————————————————————————————————————— */

function truncateStatus(value: string, max = 48): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function OrchestrationStatusStrip({
  uiMode,
  className,
}: {
  uiMode: UiMode;
  className?: string;
}) {
  const setMode = useUiModeStore((s) => s.setMode);
  const lastCommand = useOsStore((s) => s.kernel.lastCommand);
  const taskId = useOsStore((s) => s.graph.taskId);
  const activeCount = useOsStore((s) => s.graph.activeNodeIds.size);
  const cpuStep = useOsStore((s) => s.cpu.pipeline.currentStep);
  const [spawnFlash, setSpawnFlash] = useState<string | null>(null);

  useEffect(() => {
    let clearId: ReturnType<typeof setTimeout> | undefined;
    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<AgentSpawnedDetail>).detail;
      const label = detail?.templateId?.split(".").pop() ?? "agent";
      setSpawnFlash(`spawn · ${label}`);
      if (clearId) clearTimeout(clearId);
      clearId = setTimeout(() => setSpawnFlash(null), 2200);
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onSpawn);
    return () => {
      window.removeEventListener(AGENT_SPAWNED_EVENT, onSpawn);
      if (clearId) clearTimeout(clearId);
    };
  }, []);

  const agentLabel = `${activeCount} agent${activeCount === 1 ? "" : "s"}`;
  const currentTask =
    taskId ??
    (cpuStep ? `cpu.${cpuStep}` : null) ??
    (lastCommand ? truncateStatus(lastCommand) : null);
  const isIdle = activeCount === 0 && !taskId && !lastCommand && !cpuStep;

  const openWorkspace = () => {
    if (uiMode !== "workspace") setMode("workspace");
  };

  return (
    <section
      className={cn(
        "agentos-orchestration-strip relative shrink-0 border-b border-os-border/70 bg-os-panel/40",
        className
      )}
      aria-label="Agent orchestration status"
    >
      <Button
        type="button"
        onClick={openWorkspace}
        className="flex w-full min-h-[2.25rem] items-center gap-2 px-3 py-2 text-left leading-normal transition-colors hover:bg-os-panel/70 sm:gap-3 sm:px-4"
        title="Open agents workspace"
      >
        <span className="shrink-0 text-left text-[11px] leading-none text-os-dim">
          Orchestration
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1 font-mono text-[11px] leading-normal text-os-green/90">
          <span className="shrink-0 text-os-green">{agentLabel}</span>
          {currentTask ? (
            <>
              <span className="shrink-0 text-os-dim/70">·</span>
              <span className="min-w-0 truncate text-os-green/75">{currentTask}</span>
            </>
          ) : isIdle ? (
            <>
              <span className="shrink-0 text-os-dim/70">·</span>
              <span className="shrink-0 text-os-dim/80">idle</span>
            </>
          ) : null}
        </span>
        <AnimatePresence mode="wait">
          {spawnFlash ? (
            <motion.span
              key={spawnFlash}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="shrink-0"
            >
              <span className="text-left text-os-amber">
                {spawnFlash}
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden shrink-0 sm:inline"
            >
              <span className="text-left text-os-dim/70">
                view graph →
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </section>
  );
}

/* ——————————————————————————————————————— */
/*  Terminal preview card (typewriter)       */
/* ——————————————————————————————————————— */

type TerminalLineKind = "cmd" | "ok" | "prompt";

const TERMINAL_LINES: ReadonlyArray<{ text: string; kind: TerminalLineKind }> = [
  { text: "$ boot agentOS --init", kind: "cmd" },
  { text: "✓ KERNEL online", kind: "ok" },
  { text: "✓ Memory fabric linked", kind: "ok" },
  { text: "✓ 3 agents ready", kind: "ok" },
  { text: "> awaiting task...", kind: "prompt" },
];

const TERMINAL_CHAR_MS = 26;
const TERMINAL_LINE_GAP_MS = 400;
const TERMINAL_START_DELAY_MS = 350;

function TerminalPreviewCard({ reduce }: { reduce: boolean | null }) {
  const fullCounts = TERMINAL_LINES.map((l) => l.text.length);
  const [revealed, setRevealed] = useState<number[]>(() =>
    reduce ? fullCounts : TERMINAL_LINES.map(() => 0)
  );

  useEffect(() => {
    if (reduce) {
      setRevealed(TERMINAL_LINES.map((l) => l.text.length));
      return;
    }

    let raf = 0;
    const start = performance.now() + TERMINAL_START_DELAY_MS;

    const tick = () => {
      const elapsed = performance.now() - start;
      const next: number[] = [];
      let remaining = elapsed;
      let done = true;
      for (const line of TERMINAL_LINES) {
        const lineDur = line.text.length * TERMINAL_CHAR_MS;
        if (remaining <= 0) {
          next.push(0);
          done = false;
        } else if (remaining < lineDur) {
          next.push(Math.min(line.text.length, Math.floor(remaining / TERMINAL_CHAR_MS)));
          done = false;
        } else {
          next.push(line.text.length);
        }
        remaining -= lineDur + TERMINAL_LINE_GAP_MS;
      }
      setRevealed(next);
      if (!done) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const allDone = revealed.every(
    (n, i) => n >= TERMINAL_LINES[i].text.length
  );

  return (
    <div
      className="agentos-hero-terminal font-mono"
      role="presentation"
      aria-hidden
    >
      <div className="agentos-hero-terminal-bar">
        <span
          className="agentos-hero-terminal-dot"
          style={{ backgroundColor: "#FF5F57" }}
        />
        <span
          className="agentos-hero-terminal-dot"
          style={{ backgroundColor: "#FEBC2E" }}
        />
        <span
          className="agentos-hero-terminal-dot"
          style={{ backgroundColor: "#28C840" }}
        />
        <span className="agentos-hero-terminal-title">agentos · tty</span>
      </div>
      <div className="agentos-hero-terminal-body">
        {TERMINAL_LINES.map((line, i) => {
          const chars = revealed[i] ?? 0;
          const visible = line.text.slice(0, chars);
          const isLast = i === TERMINAL_LINES.length - 1;
          const colorClass =
            line.kind === "ok"
              ? "agentos-hero-terminal-line-ok"
              : "agentos-hero-terminal-line-muted";
          return (
            <div
              key={i}
              className={cn("agentos-hero-terminal-line", colorClass)}
              style={{ opacity: chars === 0 ? 0 : 1 }}
            >
              {visible || "\u00A0"}
              {isLast && allDone ? (
                <span className="agentos-hero-terminal-caret" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————— */
/*  Stats bar (animated count-up)            */
/* ——————————————————————————————————————— */

const formatAgents = (v: number) =>
  `${Math.round(v).toLocaleString("en-US")} agents spawned`;
const formatUptime = (v: number) => `${v.toFixed(1)}% uptime`;
const formatLatency = (v: number) => `~${Math.round(v)}ms avg latency`;

function StatNumber({
  to,
  format,
  reduce,
  delay = 0.5,
}: {
  to: number;
  format: (v: number) => string;
  reduce: boolean | null;
  delay?: number;
}) {
  const mv = useMotionValue(reduce ? to : 0);
  const [display, setDisplay] = useState(() => format(reduce ? to : 0));
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    if (reduce) {
      setDisplay(formatRef.current(to));
      return;
    }
    mv.set(0);
    setDisplay(formatRef.current(0));
    const controls = animate(mv, to, {
      duration: 1.2,
      ease: "easeOut",
      delay,
      onUpdate: (v) => setDisplay(formatRef.current(v)),
    });
    return () => controls.stop();
  }, [to, reduce, delay, mv]);

  return (
    <span className="agentos-hero-stats-num text-left">
      {display}
    </span>
  );
}

/* ——————————————————————————————————————— */
/*  Fullscreen hero (revamp)                 */
/* ——————————————————————————————————————— */

function FullscreenHero({ className }: { className?: string }) {
  const setMode = useUiModeStore((s) => s.setMode);
  const reduce = useReducedMotion();
  const [commandValue, setCommandValue] = useState("");
  const [commandFocused, setCommandFocused] = useState(false);
  const [doomDemoOpen, setDoomDemoOpen] = useState(false);

  const stagger = (i: number) => 0.06 + i * 0.08;

  const fadeUp = (i: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3, delay: stagger(i) },
        }
      : {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          transition: { duration: 0.6, delay: stagger(i), ease: "easeOut" as const },
        };

  const handlePrimaryCta = () => {
    setMode("workspace");
    dispatchShellCommand("spawn agent kernel.orchestrator");
  };

  const handleSecondaryCta = () => {
    setDoomDemoOpen(true);
  };

  const handleCommandSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = commandValue.trim();
    if (!value) return;
    setMode("terminal");
    dispatchShellCommand(value);
    setCommandValue("");
  };

  return (
    <section
      className={cn(
        "agentos-hero-v2 relative flex h-screen w-screen flex-col overflow-hidden",
        className
      )}
      style={{ backgroundColor: "transparent", color: PALETTE.text }}
      aria-label="AgentOS landing"
    >
      {/* slow shifting radial aurora — subtle overlay on global flickering grid */}
      <div className="agentos-hero-aurora" aria-hidden />
      {/* soft accent glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 50% 30%, rgba(0,255,178,0.08), transparent 60%), " +
            "radial-gradient(ellipse 50% 40% at 75% 85%, rgba(139,92,246,0.10), transparent 60%), " +
            "radial-gradient(ellipse 40% 35% at 15% 85%, rgba(0,255,178,0.04), transparent 60%)",
        }}
      />

      {/* centered content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-40 text-center sm:pb-44">
        <motion.div
          {...fadeUp(0)}
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] sm:text-[11px]"
          style={{
            borderColor: "rgba(0,255,178,0.28)",
            backgroundColor: "rgba(0,255,178,0.06)",
            color: PALETTE.accent,
          }}
        >
          <span
            className="agentos-pulse-dot inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: PALETTE.accent }}
            aria-hidden
          />
          <span className="text-left" style={{ color: PALETTE.accent }}>
            Live agent orchestration
          </span>
        </motion.div>

        <motion.div {...fadeUp(1)}>
          <h1 className="agentos-hero-title text-center font-mono font-bold tracking-tight text-white">
            AgentOS
          </h1>
        </motion.div>

        <motion.div {...fadeUp(2)} className="mt-5 max-w-2xl">
          <p
            className="text-center text-base leading-relaxed sm:text-lg"
            style={{ color: PALETTE.text }}
          >
            Orchestration you can see — graph, agents, and memory lanes, not a hidden terminal wall.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(3)}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        >
          {FEATURE_PILLS.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-wide sm:text-xs"
              style={{
                borderColor: PALETTE.muted,
                backgroundColor: "rgba(13,21,32,0.65)",
                color: PALETTE.text,
              }}
            >
              <span aria-hidden>{pill.icon}</span>
              <span className="text-left" style={{ color: PALETTE.text }}>
                {pill.label}
              </span>
            </span>
          ))}
        </motion.div>

        <motion.div
          {...fadeUp(4)}
          className="mt-10 grid w-full max-w-3xl grid-cols-1 items-center gap-8 lg:max-w-5xl lg:grid-cols-2 lg:gap-12"
        >
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-end">
            <Button
              type="button"
              onClick={handlePrimaryCta}
              className={cn(
                "agentos-cta-glow group relative inline-flex items-center justify-center gap-2 rounded-lg border px-7 py-3 font-mono text-sm font-medium tracking-wide transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                reduce ? "agentos-cta-glow-static" : undefined
              )}
              style={
                {
                  borderColor: PALETTE.accent,
                  backgroundColor: PALETTE.surface,
                  color: PALETTE.accent,
                  "--tw-ring-color": PALETTE.accent,
                  "--tw-ring-offset-color": PALETTE.bg,
                } as CSSProperties
              }
            >
              <span className="text-left" style={{ color: PALETTE.accent }}>
                Spawn your first agent
              </span>
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Button>

            <Button
              type="button"
              onClick={handleSecondaryCta}
              className="inline-flex items-center justify-center rounded-lg border bg-transparent px-6 py-3 font-mono text-sm tracking-wide transition-colors duration-200 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2"
              style={
                {
                  borderColor: PALETTE.muted,
                  color: PALETTE.text,
                  "--tw-ring-color": PALETTE.muted,
                } as CSSProperties
              }
            >
              <span className="text-left" style={{ color: PALETTE.text }}>
                Watch DOOM demo
              </span>
            </Button>
          </div>

          <div className="hidden w-full justify-start lg:flex">
            <TerminalPreviewCard reduce={reduce} />
          </div>
        </motion.div>

        <motion.div
          {...fadeUp(5)}
          className="agentos-hero-stats mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 py-1 font-mono text-[11px] leading-normal sm:gap-x-6 sm:text-xs"
          aria-label="Platform stats"
        >
          <StatNumber to={2847} format={formatAgents} reduce={reduce} />
          <span aria-hidden className="agentos-hero-stats-sep">
            ·
          </span>
          <StatNumber to={99.2} format={formatUptime} reduce={reduce} />
          <span aria-hidden className="agentos-hero-stats-sep">
            ·
          </span>
          <StatNumber to={340} format={formatLatency} reduce={reduce} />
        </motion.div>
      </div>

      {/* persistent command bar — positioned above dock */}
      <motion.form
        {...fadeUp(6)}
        onSubmit={handleCommandSubmit}
        className="pointer-events-auto absolute bottom-32 left-1/2 z-10 w-[min(92vw,640px)] -translate-x-1/2 sm:bottom-36"
        role="search"
        aria-label="Command bar"
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm shadow-lg backdrop-blur-md transition-colors",
          )}
          style={{
            borderColor: commandFocused ? PALETTE.accent : PALETTE.muted,
            backgroundColor: "rgba(13,21,32,0.85)",
            boxShadow: commandFocused
              ? "0 0 0 1px rgba(0,255,178,0.25), 0 10px 40px -10px rgba(0,255,178,0.25)"
              : "0 8px 30px -12px rgba(0,0,0,0.6)",
          }}
        >
          <span
            aria-hidden
            className="select-none font-mono text-xs"
            style={{ color: PALETTE.accent }}
          >
            ❯
          </span>
          <input
            type="text"
            value={commandValue}
            onChange={(e) => setCommandValue(e.target.value)}
            onFocus={() => setCommandFocused(true)}
            onBlur={() => setCommandFocused(false)}
            placeholder="submit task · spawn agent · recall memory..."
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-70"
            style={{ color: PALETTE.text, caretColor: PALETTE.accent }}
            aria-label="Type a command"
          />
          <Button
            type="submit"
            className="agentos-run-glow inline-flex shrink-0 items-center gap-1 rounded-md border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            style={
              {
                borderColor: PALETTE.accent,
                backgroundColor: "rgba(0,255,178,0.10)",
                color: PALETTE.accent,
                "--tw-ring-color": PALETTE.accent,
              } as CSSProperties
            }
            aria-label="Run command"
          >
            <span className="text-left" style={{ color: PALETTE.accent }}>
              Run
            </span>
            <span aria-hidden>↵</span>
          </Button>
        </div>
        <p
          className="mt-2 text-center text-[11px] leading-snug sm:text-xs"
          style={{ color: PALETTE.text, opacity: 0.55 }}
        >
          press enter to dispatch · routed through kernel shell
        </p>
      </motion.form>

      <DoomDemoModal open={doomDemoOpen} onClose={() => setDoomDemoOpen(false)} />
    </section>
  );
}

/* ——————————————————————————————————————— */
/*  Public component                          */
/* ——————————————————————————————————————— */

export type AgentOsHeroVariant = "fullscreen" | "strip";

interface AgentOsHeroProps {
  variant?: AgentOsHeroVariant;
  uiMode?: UiMode;
  className?: string;
}

export function AgentOsHero({
  variant = "fullscreen",
  uiMode = "terminal",
  className,
}: AgentOsHeroProps) {
  if (variant === "strip") {
    return <OrchestrationStatusStrip uiMode={uiMode} className={className} />;
  }
  return <FullscreenHero className={className} />;
}

export default AgentOsHero;
