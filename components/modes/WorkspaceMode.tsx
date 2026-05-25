"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { buildOsPanels } from "@/components/modes/OsPanelSlots";
import { WorkspaceAgentGraph } from "@/components/modes/WorkspaceAgentGraph";
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

function WorkspaceTelemetry() {
  const kernel = useOsStore((s) => s.kernel);
  const selectedModelId = useOsStore((s) => s.selectedModelId);
  const graph = useOsStore((s) => s.graph);
  const usage = kernel.lastUsage;
  const hb = kernel.heartbeat;
  const model = openRouterModelById(selectedModelId);
  const isFree = model?.id.includes("free") ?? selectedModelId.includes("free");
  const tokensIn = usage?.promptTokens ?? 0;
  const tokensOut = usage?.completionTokens ?? 0;
  const costMock = ((tokensIn + tokensOut) * 0.000002).toFixed(4);
  const latencyMs = hb ? Math.max(12, Math.round(hb.uptimeMs % 120) + 18) : null;
  const status = kernel.connected ? (hb?.status ?? "online") : "offline";

  return (
    <footer
      aria-label="Workspace telemetry"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-os-border/60 bg-os-panel/35 px-3 py-2 font-mono text-[10px] text-os-dim"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          tokens{" "}
          <span className="text-os-green">
            {tokensIn}+{tokensOut}
          </span>
        </span>
        <span>
          cost <span className="text-os-amber">${costMock}</span>
        </span>
        <span>
          model{" "}
          <span className="text-os-green">
            {selectedModelId.split("/").pop()}
            {isFree ? " · free" : ""}
          </span>
        </span>
        <span>
          latency{" "}
          <span className="text-os-green">{latencyMs != null ? `${latencyMs}ms` : "—"}</span>
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
        {graph.taskId && (
          <span className="truncate text-os-green/80">task {graph.taskId}</span>
        )}
        {[...graph.activeNodeIds].slice(0, 6).map((id) => (
          <span
            key={id}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[9px]",
              signatureClass(resolveAgentSignature(id))
            )}
          >
            {id.split(".").pop()}
          </span>
        ))}
      </div>
    </footer>
  );
}

export function WorkspaceMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  const panels = buildOsPanels(hydraConfigured);

  return (
    <div className="workspace-mode flex h-full min-h-0 flex-col overflow-hidden bg-os-bg font-mono text-os-green">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,222,128,0.05),_transparent_55%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:p-3">
        {/* Row 1: AGENT GRAPH | ACTIVE TASK | MEMORY | TERMINAL */}
        <div className="grid min-h-0 flex-[1.1] grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MissionPanel
            title="Agent graph"
            id="devfactory-agent-graph"
            className="min-h-[120px]"
          >
            <WorkspaceAgentGraph hydraConfigured={hydraConfigured} />
          </MissionPanel>
          <MissionPanel title="Active task" className="min-h-[120px]">
            {panels.cpu}
          </MissionPanel>
          <MissionPanel title="Memory" id="devfactory-memory" className="min-h-[120px]">
            {panels.memory}
          </MissionPanel>
          <MissionPanel title="Terminal" id="devfactory-shell" className="min-h-[120px]">
            <div className="h-full min-h-[100px] overflow-hidden rounded-lg border border-os-border bg-os-bg">
              {panels.shell}
            </div>
          </MissionPanel>
        </div>

        {/* Row 2: LIVE EXECUTION SPACE — GPU heatmap + IO bus */}
        <MissionPanel
          title="Live execution space"
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
