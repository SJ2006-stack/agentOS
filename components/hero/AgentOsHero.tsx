"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HeroGraphMini } from "@/components/hero/HeroGraphMini";
import { AGENT_SPAWNED_EVENT, type AgentSpawnedDetail } from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";
import { type UiMode, useUiModeStore } from "@/store/uiModeStore";

const SUBCOPY = ["Spawn agents", "Deploy workflows", "Observe intelligence"] as const;

function TelemetryChip({
  label,
  value,
  style,
  alert,
}: {
  label: string;
  value: string;
  style: React.CSSProperties;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "hero-telemetry-chip pointer-events-none absolute rounded-md border px-2 py-1 font-mono text-[10px] backdrop-blur-sm",
        alert
          ? "border-hero-crimson/40 bg-hero-crimson/10 text-hero-crimson"
          : "border-hero-graphite/60 bg-hero-obsidian/70 text-hero-muted"
      )}
      style={style}
    >
      <span className="text-hero-cyan/80">{label}</span>{" "}
      <span className={alert ? "text-hero-crimson" : "text-hero-cyan"}>{value}</span>
    </div>
  );
}

function formatLastUsageTokens(
  usage: { promptTokens: number; completionTokens: number } | null
): string {
  if (!usage) return "—";
  const total = usage.promptTokens + usage.completionTokens;
  if (total <= 0) return "—";
  if (total >= 1000) return `${(total / 1000).toFixed(2)}k`;
  return String(total);
}

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
      <button
        type="button"
        onClick={openWorkspace}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-os-panel/70 sm:px-4"
        title="Open agents workspace"
      >
        <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.22em] text-os-dim">
          Orchestration
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-os-green/90">
          <span className="text-os-green">{agentLabel}</span>
          {currentTask ? (
            <>
              <span className="text-os-dim/70"> · </span>
              <span className="text-os-green/75">{currentTask}</span>
            </>
          ) : isIdle ? (
            <>
              <span className="text-os-dim/70"> · </span>
              <span className="text-os-dim/80">idle</span>
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
              className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-os-amber"
            >
              {spawnFlash}
            </motion.span>
          ) : (
            <motion.span
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="hidden shrink-0 text-[9px] text-os-dim/70 sm:inline"
            >
              view graph →
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </section>
  );
}

export type AgentOsHeroVariant = "fullscreen" | "strip";

interface AgentOsHeroProps {
  variant?: AgentOsHeroVariant;
  uiMode?: UiMode;
  className?: string;
}

export function AgentOsHero({ variant = "fullscreen", uiMode = "terminal", className }: AgentOsHeroProps) {
  const setMode = useUiModeStore((s) => s.setMode);
  const lastUsage = useOsStore((s) => s.kernel.lastUsage);
  const hydraConfigured = useOsStore((s) => s.hydraConfigured);
  const activeCount = useOsStore((s) => s.graph.activeNodeIds.size);
  const [spawnFlash, setSpawnFlash] = useState<string | null>(null);

  useEffect(() => {
    if (variant === "strip") return;
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
  }, [variant]);

  const lastUsageTokens = formatLastUsageTokens(lastUsage);

  const telemetryChips = [
    { label: "tokens", value: lastUsageTokens, top: "12%", left: "8%", alert: false },
    { label: "agents", value: String(activeCount), top: "22%", right: "10%", alert: false },
    { label: "latency", value: "—", bottom: "28%", left: "6%", alert: false },
    {
      label: "memory",
      value: hydraConfigured ? "live" : "offline",
      bottom: "18%",
      right: "8%",
      alert: !hydraConfigured,
    },
  ];

  if (variant === "strip") {
    return <OrchestrationStatusStrip uiMode={uiMode} className={className} />;
  }

  return (
    <section
      className={cn(
        "agentos-hero relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden",
        className
      )}
    >
      <div className="hero-gradient-bg" aria-hidden />
      <div className="hero-particles hero-particles-lite" aria-hidden />
      <div className="hero-network-lines" aria-hidden />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.22]">
        <div className="h-[min(52vh,420px)] w-[min(90vw,720px)]">
          <HeroGraphMini className="h-full w-full" />
        </div>
      </div>

      {telemetryChips.map((chip) => (
        <TelemetryChip
          key={chip.label}
          label={chip.label}
          value={chip.value}
          alert={chip.alert}
          style={{
            top: chip.top,
            left: chip.left,
            right: chip.right,
            bottom: chip.bottom,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex max-w-2xl flex-col items-center px-6 text-center"
      >
        <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-hero-purple/90">
          Live agent orchestration
        </p>
        <h1 className="bg-gradient-to-b from-hero-cyan via-white/95 to-hero-purple/80 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl md:text-7xl">
          AgentOS
        </h1>
        <p className="mt-4 text-base text-hero-muted sm:text-lg">
          The Operating System for Autonomous Intelligence
        </p>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-hero-muted/90 sm:text-sm">
          {SUBCOPY.map((item, i) => (
            <span key={item} className="inline-flex items-center gap-3">
              {i > 0 && (
                <span className="text-hero-graphite" aria-hidden>
                  /
                </span>
              )}
              <span className="text-hero-cyan/90">{item}</span>
            </span>
          ))}
        </p>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode("terminal")}
          className="mt-10 rounded-lg border border-hero-cyan/40 bg-hero-graphite/40 px-8 py-3 text-sm font-medium tracking-wide text-hero-cyan shadow-lg shadow-hero-cyan/10 transition-colors hover:border-hero-cyan/70 hover:bg-hero-cyan/10 hover:text-white"
        >
          Enter active workspace
        </motion.button>
        <p className="mt-4 text-[10px] text-hero-muted/60">
          Orchestration · Memory fabric · Realtime agents
        </p>
      </motion.div>

      <AnimatePresence>
        {spawnFlash && (
          <motion.p
            key={spawnFlash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-[38%] z-20 text-sm uppercase tracking-[0.35em] text-hero-cyan/90"
          >
            {spawnFlash}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
