"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useDragControls } from "motion/react";
import {
  Bot,
  Brain,
  Cpu,
  FlaskConical,
  Monitor,
  Rocket,
  Workflow,
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
import { useOsStore } from "@/store/osStore";
import { useUiModeStore } from "@/store/uiModeStore";

type DesktopIconId =
  | "agents"
  | "memory"
  | "deployments"
  | "workflows"
  | "research"
  | "monitor";

const DESKTOP_ICONS: {
  id: DesktopIconId;
  label: string;
  icon: React.ReactNode;
  command?: string;
  focusId?: string;
}[] = [
  {
    id: "agents",
    label: "My Agents",
    icon: <Bot className="size-8" strokeWidth={1.25} />,
    command: "agents",
    focusId: "devfactory-agent-graph",
  },
  {
    id: "memory",
    label: "Memory Vault",
    icon: <Brain className="size-8" strokeWidth={1.25} />,
    command: "recall preferences",
    focusId: "devfactory-memory",
  },
  {
    id: "deployments",
    label: "Deployments",
    icon: <Rocket className="size-8" strokeWidth={1.25} />,
    command: "status",
  },
  {
    id: "workflows",
    label: "Workflows",
    icon: <Workflow className="size-8" strokeWidth={1.25} />,
    command: "agent status",
  },
  {
    id: "research",
    label: "Research",
    icon: <FlaskConical className="size-8" strokeWidth={1.25} />,
    command: "spawn agent cpu.plan",
  },
  {
    id: "monitor",
    label: "System Monitor",
    icon: <Monitor className="size-8" strokeWidth={1.25} />,
    focusId: "devfactory-shell",
  },
];

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
      className="desktop-glass-window absolute z-30 w-[min(420px,88vw)] overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex cursor-grab items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2 active:cursor-grabbing"
      >
        <span className="text-xs font-medium tracking-wide text-white/90">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-0.5 text-[10px] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[280px] overflow-auto p-3 text-xs leading-relaxed text-white/85">
        {children}
      </div>
    </motion.div>
  );
}

export function DesktopMode() {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const kernel = useOsStore((s) => s.kernel);
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

  return (
    <div className="desktop-mode relative h-full min-h-0 w-full overflow-hidden font-sans text-white">
      <div className="desktop-aurora absolute inset-0" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />

      <div className="relative z-10 flex h-[calc(100%-48px)] flex-col p-6 pt-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white/95 drop-shadow-sm">
              DevFactory Desktop
            </h1>
            <p className="text-xs text-white/55">Premium AI workspace</p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] text-white/70 backdrop-blur-md">
            kernel {kernel.connected ? "online" : "offline"}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-3 lg:max-w-3xl">
          {DESKTOP_ICONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onIconClick(item)}
              className="desktop-glossy-icon group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <span className="flex size-[72px] items-center justify-center rounded-2xl border border-white/25 bg-gradient-to-b from-white/25 to-white/5 text-white shadow-lg backdrop-blur-md transition-shadow group-hover:shadow-xl">
                {item.icon}
              </span>
              <span className="max-w-[100px] text-[11px] font-medium text-white/90 drop-shadow">
                {item.label}
              </span>
            </button>
          ))}
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
          <code className="text-sky-300">os:graph</code> broadcasts. Spawn
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
        <button
          type="button"
          className="mt-3 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] hover:bg-white/15"
          onClick={() => dispatchShellCommand("spawn agent cpu.plan")}
        >
          Run research spawn
        </button>
      </DesktopWindow>

      <div className="desktop-taskbar absolute inset-x-0 bottom-0 z-40 flex h-12 items-center gap-2 border-t border-white/15 bg-black/35 px-3 backdrop-blur-xl">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-b from-sky-500/80 to-blue-700/90 shadow-md"
          aria-label="Start"
        >
          <Cpu className="size-4 text-white" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {activeAgents.length === 0 ? (
            <span className="text-[10px] text-white/45">No active agents</span>
          ) : (
            activeAgents.map((id) => {
              const sig = resolveAgentSignature(id);
              return (
                <span
                  key={id}
                  title={id}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/80"
                >
                  <span
                    className="size-2 rounded-full shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: signatureStroke(sig) }}
                  />
                  <span className="max-w-[88px] truncate">
                    {id.split(".").pop()}
                  </span>
                </span>
              );
            })
          )}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-white/70">
          {clock}
        </span>
      </div>
    </div>
  );
}
