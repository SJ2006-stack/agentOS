"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, useDragControls } from "motion/react";
import {
  Activity,
  Archive,
  Bot,
  Cpu,
  Microscope,
  Monitor,
  Rocket,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  AGENT_SPAWNED_EVENT,
  dispatchShellCommand,
  focusCommandInput,
  type AgentSpawnedDetail,
} from "@/lib/os/shell-events";
import {
  resolveAgentSignature,
  signatureClass,
  signatureStroke,
} from "@/lib/os/agent-signature";
import { cn } from "@/lib/utils";
import { CPU_STEPS, useOsStore } from "@/store/os/osStore";
import { useUiModeStore } from "@/store/ui/uiModeStore";

type DesktopIconId =
  | "agents"
  | "memory"
  | "deployments"
  | "workflows"
  | "research"
  | "monitor";

type DesktopIconAccent = {
  container: string;
  icon: string;
  badge: string;
  label: string;
};

const DESKTOP_ICON_ACCENTS: Record<DesktopIconId, DesktopIconAccent> = {
  agents: {
    container:
      "border-os-green/30 bg-gradient-to-br from-os-green/25 via-os-panel/45 to-os-bg/80 shadow-[0_8px_28px_color-mix(in_srgb,var(--os-green)_22%,transparent)]",
    icon: "text-os-green drop-shadow-[0_0_12px_color-mix(in_srgb,var(--os-green)_45%,transparent)]",
    badge: "bg-os-green/90",
    label: "text-os-green/95",
  },
  memory: {
    container:
      "border-violet-300/35 bg-gradient-to-br from-violet-400/40 via-purple-600/25 to-violet-950/50 shadow-[0_8px_28px_rgba(139,92,246,0.35)]",
    icon: "text-violet-50 drop-shadow-[0_0_12px_rgba(167,139,250,0.55)]",
    badge: "bg-violet-400/90",
    label: "text-violet-100/95",
  },
  deployments: {
    container:
      "border-amber-300/35 bg-gradient-to-br from-amber-400/45 via-orange-600/25 to-amber-950/50 shadow-[0_8px_28px_rgba(245,158,11,0.35)]",
    icon: "text-amber-50 drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]",
    badge: "bg-amber-400/90",
    label: "text-amber-100/95",
  },
  workflows: {
    container:
      "border-cyan-300/35 bg-gradient-to-br from-cyan-400/40 via-sky-600/25 to-cyan-950/50 shadow-[0_8px_28px_rgba(34,211,238,0.35)]",
    icon: "text-cyan-50 drop-shadow-[0_0_12px_rgba(103,232,249,0.55)]",
    badge: "bg-cyan-400/90",
    label: "text-cyan-100/95",
  },
  research: {
    container:
      "border-rose-300/35 bg-gradient-to-br from-rose-400/40 via-pink-600/25 to-rose-950/50 shadow-[0_8px_28px_rgba(244,63,94,0.35)]",
    icon: "text-rose-50 drop-shadow-[0_0_12px_rgba(251,113,133,0.55)]",
    badge: "bg-rose-400/90",
    label: "text-rose-100/95",
  },
  monitor: {
    container:
      "border-slate-300/30 bg-gradient-to-br from-slate-400/35 via-slate-600/20 to-slate-950/55 shadow-[0_8px_28px_rgba(100,116,139,0.3)]",
    icon: "text-slate-100 drop-shadow-[0_0_10px_rgba(148,163,184,0.45)]",
    badge: "bg-slate-400/85",
    label: "text-slate-100/90",
  },
};

const DESKTOP_ICONS: {
  id: DesktopIconId;
  label: string;
  description: string;
  Icon: LucideIcon;
  command?: string;
  focusId?: string;
}[] = [
  {
    id: "agents",
    label: "My Agents",
    description: "Spawn & manage AI agents",
    Icon: Bot,
    command: "agents",
    focusId: "devfactory-agent-graph",
  },
  {
    id: "memory",
    label: "Memory Vault",
    description: "Saved context & preferences",
    Icon: Archive,
    command: "recall preferences",
    focusId: "devfactory-memory",
  },
  {
    id: "deployments",
    label: "Deployments",
    description: "Ship builds & live status",
    Icon: Rocket,
    command: "status",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Multi-step agent pipelines",
    Icon: Workflow,
    command: "agent status",
  },
  {
    id: "research",
    label: "Research",
    description: "Deep-dive analysis lane",
    Icon: Microscope,
    command: "spawn agent cpu.plan",
  },
  {
    id: "monitor",
    label: "System Monitor",
    description: "Kernel, logs & terminal",
    Icon: Monitor,
    focusId: "devfactory-shell",
  },
];

function truncateModelId(id: string, max = 20): string {
  const short = id.includes("/") ? (id.split("/").pop() ?? id) : id;
  if (short.length <= max) return short;
  return `${short.slice(0, max - 1)}…`;
}

function kernelStatusTone(status: string, connected: boolean): string {
  if (!connected) return "text-rose-300";
  if (status === "online") return "text-emerald-300";
  if (status === "degraded") return "text-amber-300";
  return "text-rose-300";
}

function DesktopGlassCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-gradient-to-br from-white/12 to-white/[0.03] backdrop-blur-md",
        className
      )}
    >
      {title ? (
        <header className="border-b border-white/10 px-3 py-2">
          <span className="text-left text-white/50">
            {title}
          </span>
        </header>
      ) : null}
      <div className="p-3">{children}</div>
    </div>
  );
}

function focusPanel(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  el.classList.add("ring-2", "ring-os-amber/60");
  window.setTimeout(() => el.classList.remove("ring-2", "ring-os-amber/60"), 1200);
}

function DesktopWindow({
  title,
  open,
  onClose,
  defaultPosition,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  defaultPosition: { x: number; y: number };
  children: React.ReactNode;
}) {
  const dragControls = useDragControls();

  if (!open) return null;

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      style={{ left: defaultPosition.x, top: defaultPosition.y }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="desktop-glass-window absolute z-30 w-[min(420px,88vw)] overflow-hidden rounded-2xl border border-os-green/15 shadow-2xl"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex cursor-grab flex-wrap items-center justify-between gap-2 border-b border-os-green/10 bg-os-panel/20 px-3 py-2 active:cursor-grabbing"
      >
        <span className="min-w-0 text-left text-os-green/90">
          {title}
        </span>
        <Button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          ✕
        </Button>
      </div>
      <div className="max-h-[280px] overflow-auto p-3 text-xs leading-relaxed text-white/85">
        {children}
      </div>
    </motion.div>
  );
}

export function DesktopMode() {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const taskId = useOsStore((s) => s.graph.taskId ?? s.cpu.pipeline.taskId);
  const lastCommand = useOsStore((s) => s.kernel.lastCommand);
  const currentStep = useOsStore((s) => s.cpu.pipeline.currentStep);
  const completedSteps = useOsStore((s) => s.cpu.pipeline.completedSteps);
  const kernel = useOsStore((s) => s.kernel);
  const gpuWorkers = useOsStore((s) => s.gpu.activeWorkers);
  const memorySlots = useOsStore((s) => s.memory.slots);
  const memoryConnected = useOsStore((s) => s.memory.connected);
  const selectedModelId = useOsStore((s) => s.selectedModelId);
  const ioEvents = useOsStore((s) => s.io.events);
  const [researchOpen, setResearchOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<AgentSpawnedDetail>).detail;
      const hay = `${detail?.templateId ?? ""} ${detail?.role ?? ""}`.toLowerCase();
      if (hay.includes("research") || hay.includes("plan")) {
        setResearchOpen(true);
      }
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onSpawn);
    return () => window.removeEventListener(AGENT_SPAWNED_EVENT, onSpawn);
  }, []);

  const setMode = useUiModeStore((s) => s.setMode);

  const onIconClick = useCallback(
    (item: (typeof DESKTOP_ICONS)[0]) => {
      if (item.id === "monitor") {
        setMode("terminal");
        focusCommandInput();
        if (item.focusId) focusPanel(item.focusId);
        return;
      }
      if (item.id === "agents" || item.id === "memory") {
        setMode("workspace");
      }
      if (item.command) dispatchShellCommand(item.command);
      if (item.focusId) focusPanel(item.focusId);
      if (item.id === "research") setResearchOpen(true);
    },
    [setMode]
  );

  const activeAgents = [...activeNodeIds];
  const agentCount = activeAgents.length;
  const showPipeline = currentStep !== null || completedSteps.length > 0;
  const hb = kernel.heartbeat;
  const usage = kernel.lastUsage;
  const kernelStatus = kernel.connected ? (hb?.status ?? "online") : "offline";
  const uptimeSec = hb?.uptimeMs != null ? Math.floor(hb.uptimeMs / 1000) : null;
  const tokensLabel = usage
    ? `${usage.promptTokens}+${usage.completionTokens}`
    : "—";

  return (
    <div className="desktop-mode relative h-full min-h-0 w-full overflow-hidden font-sans text-white">
      <div className="desktop-aurora absolute inset-0" aria-hidden />
      <div className="desktop-aurora-glow absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--os-green)_10%,transparent),transparent_50%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col pb-12">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <span className="text-left text-white/95">
              DevFactory OS
            </span>
            <span className="text-left text-os-green/50">
              Desktop launcher · same six apps as Agents workspace
            </span>
            <div className="mt-1 space-y-1">
              <p className="text-xs text-white/70">
                {taskId ? (
                  <>
                    Task{" "}
                    <span className="font-mono text-white/85">{taskId}</span>
                  </>
                ) : (
                  <span className="text-white/50">No active task</span>
                )}
                <span className="text-white/35"> · </span>
                <span
                  className={agentCount > 0 ? "text-white/75" : "text-white/45"}
                >
                  {agentCount} agent{agentCount === 1 ? "" : "s"}
                  {agentCount > 0 ? " live" : ""}
                </span>
              </p>
              {(lastCommand || showPipeline) && (
                <div className="flex flex-wrap items-center gap-2">
                  {showPipeline && (
                    <div
                      className="flex items-center gap-0.5"
                      aria-label="CPU pipeline"
                      title={currentStep ? `Running ${currentStep}` : "Pipeline progress"}
                    >
                      {CPU_STEPS.map((step) => {
                        const active = currentStep === step;
                        const done = completedSteps.includes(step);
                        return (
                          <span
                            key={step}
                            className={cn(
                              "size-1.5 rounded-full transition-colors",
                              active &&
                                "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]",
                              !active && done && "bg-white/50",
                              !active && !done && "bg-white/15"
                            )}
                          />
                        );
                      })}
                    </div>
                  )}
                  {lastCommand && (
                    <span className="max-w-[min(280px,50vw)] truncate font-mono text-[10px] text-white/50">
                      last · {lastCommand}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border border-os-border/50 bg-os-panel/40 px-3 py-1.5 font-mono text-[10px] backdrop-blur-md",
              kernelStatusTone(kernelStatus, kernel.connected)
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                kernel.connected ? "os-telemetry-live bg-current" : "bg-os-fault/80"
              )}
              aria-hidden
            />
            kernel {kernelStatus}
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-3 sm:px-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-5">
          <section className="flex flex-col">
            <span className="mb-2 text-left text-white/45">
              Applications
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
              {DESKTOP_ICONS.map((item) => {
                const accent = DESKTOP_ICON_ACCENTS[item.id];
                const { Icon } = item;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    onClick={() => onIconClick(item)}
                    className="desktop-glossy-icon group flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <span
                      className={cn(
                        "relative flex size-[76px] items-center justify-center rounded-2xl border backdrop-blur-md transition-[box-shadow,ring-color] group-hover:shadow-2xl group-hover:ring-1 group-hover:ring-os-green/25 sm:size-[84px]",
                        accent.container
                      )}
                    >
                      <span
                        className={cn(
                          "absolute right-2 top-2 size-2 rounded-full ring-2 ring-white/25",
                          accent.badge
                        )}
                        aria-hidden
                      />
                      <Icon
                        className={cn("size-9", accent.icon)}
                        strokeWidth={1.35}
                      />
                    </span>
                    <span className={cn("max-w-[96px] text-left leading-tight", accent.label)}>
                      {item.label}
                    </span>
                    <span className="hidden max-w-[96px] text-[9px] leading-snug text-white/50 group-hover:text-white/65 sm:block">
                      {item.description}
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <DesktopGlassCard className="!p-0">
                <div className="flex items-start gap-2 p-2.5">
                  <Cpu className="mt-0.5 size-3.5 shrink-0 text-sky-300/80" />
                  <div className="min-w-0">
                    <span className="text-left text-white/45">
                      Kernel
                    </span>
                    <p
                      className={cn(
                        "truncate text-sm font-semibold capitalize",
                        kernelStatusTone(kernelStatus, kernel.connected)
                      )}
                    >
                      {kernelStatus}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {uptimeSec != null
                        ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s`
                        : "awaiting heartbeat"}
                    </p>
                  </div>
                </div>
              </DesktopGlassCard>

              <DesktopGlassCard className="!p-0">
                <div className="flex items-start gap-2 p-2.5">
                  <Zap className="mt-0.5 size-3.5 shrink-0 text-amber-300/80" />
                  <div className="min-w-0">
                    <span className="text-left text-white/45">
                      Tokens
                    </span>
                    <p className="truncate text-sm font-semibold text-white/90">
                      {tokensLabel}
                    </p>
                    <p
                      className="truncate text-[10px] text-white/50"
                      title={selectedModelId}
                    >
                      {truncateModelId(selectedModelId)}
                    </p>
                  </div>
                </div>
              </DesktopGlassCard>

              <DesktopGlassCard className="!p-0">
                <div className="flex items-start gap-2 p-2.5">
                  <Bot className="mt-0.5 size-3.5 shrink-0 text-violet-300/80" />
                  <div className="min-w-0">
                    <span className="text-left text-white/45">
                      Agents
                    </span>
                    <p className="text-sm font-semibold text-white/90">
                      {agentCount} active
                    </p>
                    <p className="truncate text-[10px] text-white/50">
                      {taskId ? `Task ${taskId}` : "no task bound"}
                    </p>
                  </div>
                </div>
              </DesktopGlassCard>

              <DesktopGlassCard className="!p-0">
                <div className="flex items-start gap-2 p-2.5">
                  <Activity className="mt-0.5 size-3.5 shrink-0 text-emerald-300/80" />
                  <div className="min-w-0">
                    <span className="text-left text-white/45">
                      Subsystems
                    </span>
                    <p className="text-sm font-semibold text-white/90">
                      GPU ×{gpuWorkers}
                    </p>
                    <p className="truncate text-[10px] text-white/50">
                      {memoryConnected ? "memory linked" : "memory idle"} ·{" "}
                      {memorySlots.length} slots
                      {currentStep ? ` · ${currentStep}` : ""}
                    </p>
                  </div>
                </div>
              </DesktopGlassCard>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
              <DesktopGlassCard
                title="Recent agents"
                className="flex min-h-0 flex-col overflow-hidden !p-0"
              >
                <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-3">
                  {activeAgents.length === 0 ? (
                    <p className="text-[11px] text-white/45">
                      No agents on the graph. Launch Research or open My Agents.
                    </p>
                  ) : (
                    activeAgents.slice(0, 8).map((id) => {
                      const sig = resolveAgentSignature(id);
                      return (
                        <div
                          key={id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                            signatureClass(sig)
                          )}
                        >
                          <span
                            className="size-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]"
                            style={{ backgroundColor: signatureStroke(sig) }}
                          />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-white/85">
                            {id}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </DesktopGlassCard>

              <div className="flex min-h-0 flex-col gap-3">
                <DesktopGlassCard title="Last command" className="min-h-0 flex-1 !p-0">
                  <p className="p-3 font-mono text-[11px] leading-relaxed text-white/75">
                    {lastCommand ? (
                      <code className="text-sky-200/90">{lastCommand}</code>
                    ) : (
                      <span className="text-white/45">
                        Idle — click an app or use the shell.
                      </span>
                    )}
                  </p>
                </DesktopGlassCard>

                <DesktopGlassCard title="I/O bus" className="min-h-0 flex-1 !p-0">
                  <div className="max-h-[120px] space-y-1 overflow-auto p-3">
                    {ioEvents.length === 0 ? (
                      <p className="text-[11px] text-white/45">No recent tool calls.</p>
                    ) : (
                      ioEvents.slice(0, 5).map((evt, i) => (
                        <p
                          key={`${evt.tool}-${evt.ts}-${i}`}
                          className="truncate font-mono text-[10px] text-white/65"
                        >
                          <span className="text-white/40">{evt.layer}</span> {evt.tool}
                        </p>
                      ))
                    )}
                  </div>
                </DesktopGlassCard>
              </div>
            </div>
          </section>
        </div>
      </div>

      <DesktopWindow
        title="ResearchAgent"
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
        defaultPosition={{ x: 48, y: 72 }}
      >
        <p className="text-white/70">
          Research lane active. Graph nodes pulse on{" "}
          <code className="text-os-cyan/90">os:graph</code> broadcasts. Spawn
          custom research agents from the shell or Memory Vault.
        </p>
        <ul className="mt-2 space-y-1 text-white/60">
          {activeAgents.length === 0 ? (
            <li>No active graph nodes.</li>
          ) : (
            activeAgents.map((id) => {
              const sig = resolveAgentSignature(id);
              return (
                <li
                  key={id}
                  className={cn("rounded border px-2 py-1", signatureClass(sig))}
                >
                  {id}
                </li>
              );
            })
          )}
        </ul>
        <Button
          type="button"
          className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] hover:bg-white/15"
          onClick={() => dispatchShellCommand("spawn agent cpu.plan")}
        >
          <span className="text-center text-white">
            Run research spawn
          </span>
        </Button>
      </DesktopWindow>

      <div className="desktop-taskbar absolute inset-x-0 bottom-0 z-40 flex h-12 items-center gap-2 px-3 backdrop-blur-xl">
        <Button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg border border-os-green/25 bg-gradient-to-b from-os-green/25 to-os-panel/80 shadow-[0_0_12px_color-mix(in_srgb,var(--os-green)_20%,transparent)]"
          aria-label="Start — open terminal"
          onClick={() => {
            setMode("terminal");
            focusCommandInput();
            focusPanel("devfactory-shell");
          }}
        >
          <Cpu className="size-4 text-os-green" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 text-left text-os-dim/70">
            agents
          </span>
          {activeAgents.length === 0 ? (
            <span className="text-[10px] text-os-dim/60">none active</span>
          ) : (
            activeAgents.map((id) => {
              const sig = resolveAgentSignature(id);
              return (
                <span
                  key={id}
                  title={id}
                  className={cn(
                    "flex items-center gap-1.5 rounded border px-2 py-1 text-[10px] shadow-[0_0_8px_color-mix(in_srgb,var(--os-green)_15%,transparent)]",
                    signatureClass(sig)
                  )}
                >
                  <span
                    className="size-1.5 rounded-full os-telemetry-live"
                    style={{ backgroundColor: signatureStroke(sig) }}
                  />
                  <span className="max-w-[88px] truncate text-os-green/90">
                    {id.split(".").pop()}
                  </span>
                </span>
              );
            })
          )}
        </div>
        <span className="shrink-0 tabular-nums text-[11px] text-os-dim/80">
          {clock}
        </span>
      </div>
    </div>
  );
}
