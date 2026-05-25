"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import "./workspace-ux.css";
import { buildOsPanels } from "@/components/modes/OsPanelSlots";
import { openRouterModelById } from "@/lib/ai/models-client";
import { resolveAgentSignature, signatureClass } from "@/lib/os/agent-signature";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

function MissionPanel({
  title,
  children,
  className,
  id,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl border border-os-border/80 bg-os-panel/45 p-2 backdrop-blur-sm",
        className
      )}
    >
      <header className="mb-1 shrink-0 border-b border-os-border/40 pb-1 text-[10px] font-medium uppercase tracking-widest text-os-dim">
        {title}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </motion.section>
  );
}

const WorkspaceTelemetry = memo(function WorkspaceTelemetry() {
  const kernel = useOsStore((s) => s.kernel);
  const selectedModelId = useOsStore((s) => s.selectedModelId);
  const graph = useOsStore((s) => s.graph);
  const usage = kernel.lastUsage;
  const hb = kernel.heartbeat;
  const model = openRouterModelById(selectedModelId);
  const isFree = model?.id.includes("free") ?? selectedModelId.includes("free");
  const tokensLabel = usage
    ? `${usage.promptTokens}+${usage.completionTokens}`
    : "—";
  const status = kernel.connected ? (hb?.status ?? "online") : "offline";
  const uptimeSec = hb?.uptimeMs != null ? Math.floor(hb.uptimeMs / 1000) : null;
  const [usageFlash, setUsageFlash] = useState(false);
  const lastUsageKey = useRef<string | null>(null);

  useEffect(() => {
    if (!usage) return;
    const key = `${usage.promptTokens}:${usage.completionTokens}`;
    if (lastUsageKey.current === key) return;
    lastUsageKey.current = key;
    setUsageFlash(true);
    const id = window.setTimeout(() => setUsageFlash(false), 480);
    return () => window.clearTimeout(id);
  }, [usage]);

  return (
    <footer
      aria-label="Workspace telemetry"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-os-border/60 bg-os-panel/35 px-3 py-2 font-mono text-[10px] text-os-dim"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              kernel.connected ? "workspace-telemetry-live bg-os-green" : "bg-os-fault/80"
            )}
            aria-hidden
          />
          <span className="uppercase tracking-wider text-os-dim/90">live</span>
          {uptimeSec != null && (
            <span className="text-os-green/70">
              {Math.floor(uptimeSec / 60)}m{uptimeSec % 60}s
            </span>
          )}
        </span>
        <span className={usageFlash ? "workspace-telemetry-flash" : undefined}>
          tokens <span className="text-os-green">{tokensLabel}</span>
        </span>
        <span>
          cost <span className="text-os-amber">—</span>
        </span>
        <span>
          model{" "}
          <span className="text-os-green">
            {selectedModelId.split("/").pop()}
            {isFree ? " · free" : ""}
          </span>
        </span>
        <span>
          latency <span className="text-os-green">—</span>
        </span>
        <span>
          status{" "}
          <span
            className={
              status === "online"
                ? "text-os-green"
                : status === "degraded"
                  ? "text-os-amber"
                  : "text-os-fault"
            }
          >
            {status}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {kernel.lastCommand && (
          <span className="max-w-[140px] truncate text-os-dim/80" title={kernel.lastCommand}>
            cmd {kernel.lastCommand}
          </span>
        )}
        {graph.taskId && (
          <span className="truncate text-os-green/80">task {graph.taskId}</span>
        )}
        {[...graph.activeNodeIds].slice(0, 6).map((id) => (
          <motion.span
            key={id}
            layout
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] shadow-[0_0_8px_color-mix(in_srgb,var(--os-green)_25%,transparent)]",
              signatureClass(resolveAgentSignature(id))
            )}
          >
            {id.split(".").pop()}
          </motion.span>
        ))}
      </div>
    </footer>
  );
});

export function WorkspaceMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  const panels = buildOsPanels(hydraConfigured, { showHeader: false });

  return (
    <div className="workspace-mode flex h-full min-h-0 flex-col overflow-hidden bg-os-bg font-mono text-os-green">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,222,128,0.05),_transparent_55%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:p-3">
        {/* Row 1: AGENT GRAPH | ACTIVE TASK | MEMORY | TERMINAL */}
        <div className="grid min-h-0 flex-[1.1] grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MissionPanel
            title="agent graph"
            id="devfactory-agent-graph"
            className="min-h-[120px]"
          >
            {panels.agentGraph}
          </MissionPanel>
          <MissionPanel title="active task" className="min-h-[120px]">
            {panels.cpu}
          </MissionPanel>
          <MissionPanel title="memory" id="devfactory-memory" className="min-h-[120px]">
            {panels.memory}
          </MissionPanel>
          <MissionPanel title="terminal" id="devfactory-shell" className="min-h-[120px]">
            <div className="h-full min-h-[100px] overflow-hidden rounded-lg border border-os-border bg-os-bg">
              {panels.shell}
            </div>
          </MissionPanel>
        </div>

        {/* Row 2: LIVE EXECUTION SPACE — GPU heatmap + IO bus */}
        <MissionPanel
          title="live execution space"
          className="min-h-0 flex-[1.35]"
        >
          <div className="grid h-full min-h-[140px] grid-cols-1 gap-2 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-h-0 overflow-hidden rounded-lg border border-os-border/60 p-1">
              {panels.gpu}
            </div>
            <div className="min-h-0 overflow-hidden rounded-lg border border-os-border/60 p-1">
              {panels.io}
            </div>
          </div>
        </MissionPanel>

        <div className="sr-only" aria-hidden>
          {panels.configure}
        </div>
      </div>
      <WorkspaceTelemetry />
    </div>
  );
}
