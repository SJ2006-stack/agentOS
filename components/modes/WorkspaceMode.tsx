"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./workspace-ux.css";
import { ExpandableText } from "@/components/ui/expandable-text";
import { buildOsPanels } from "@/components/modes/OsPanelSlots";
import { WorkspaceDemoBar } from "@/components/modes/WorkspaceDemoBar";
import { openRouterModelById } from "@/lib/ai/models-client";
import { resolveAgentSignature, signatureClass } from "@/lib/os/agent-signature";
import type { CpuPipelineState, CpuStep } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

type PanelVariant = "primary" | "secondary" | "muted";

const PANEL_STYLES: Record<PanelVariant, string> = {
  primary:
    "rounded-xl border border-os-border/90 bg-os-panel/55 shadow-[inset_0_1px_0_color-mix(in_srgb,white_4%,transparent)] backdrop-blur-sm",
  secondary: "rounded-lg border border-os-border/30 bg-os-panel/18 backdrop-blur-sm",
  muted: "rounded-lg border border-os-border/12 bg-os-panel/8",
};

const HEADER_STYLES: Record<PanelVariant, string> = {
  primary:
    "mb-1.5 shrink-0 border-b border-os-border/45 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-os-green/85",
  secondary:
    "mb-1 shrink-0 text-[9px] font-medium uppercase tracking-wider text-os-dim/65",
  muted: "mb-0.5 shrink-0 text-[8px] uppercase tracking-wider text-os-dim/40",
};

const CPU_STATUS_LABELS: Record<CpuStep, string> = {
  INTAKE: "Understanding your request",
  PLAN: "Planning",
  ROUTE: "Routing work",
  DISPATCH: "Dispatching agents",
  VERIFY: "Verifying result",
  COMMIT: "Finishing up",
};

function formatPipelineStatus(pipeline: CpuPipelineState): string {
  if (pipeline.currentStep) {
    return CPU_STATUS_LABELS[pipeline.currentStep] ?? pipeline.currentStep;
  }
  if (pipeline.completedSteps.length > 0) return "Wrapping up";
  return "Ready";
}

function WorkspacePanel({
  title,
  children,
  className,
  id,
  variant = "secondary",
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  variant?: PanelVariant;
  headerAction?: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden p-2",
        PANEL_STYLES[variant],
        className
      )}
    >
      <header className={cn(HEADER_STYLES[variant], headerAction && "flex items-center gap-2")}>
        <span className="min-w-0 flex-1">{title}</span>
        {headerAction}
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </motion.section>
  );
}

const TaskOutcomeBar = memo(function TaskOutcomeBar() {
  const lastCommand = useOsStore((s) => s.kernel.lastCommand);
  const graph = useOsStore((s) => s.graph);
  const cpu = useOsStore((s) => s.cpu);
  const activeCount = graph.activeNodeIds.size;
  const taskLabel =
    lastCommand?.trim() ||
    (graph.taskId ? `Task ${graph.taskId}` : null) ||
    cpu.pipeline.taskId;
  const status = formatPipelineStatus(cpu.pipeline);
  const latest = cpu.lastMessage?.trim();

  if (!taskLabel && activeCount === 0 && !cpu.pipeline.currentStep) return null;

  return (
    <motion.aside
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22 }}
      className="workspace-hero-strip shrink-0 rounded-xl border border-os-green/25 bg-gradient-to-r from-os-green/8 via-os-panel/55 to-os-panel/35 px-3 py-2"
      aria-label="Task outcome"
    >
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1.4fr)_auto_auto] sm:items-center">
        <div className="min-w-0">
          <dt className="text-[9px] font-medium uppercase tracking-widest text-os-dim/80">
            Your request
          </dt>
          <dd className="break-words text-xs text-os-green">{taskLabel ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[9px] font-medium uppercase tracking-widest text-os-dim/80">
            Status
          </dt>
          <dd className="text-xs text-os-amber">{status}</dd>
        </div>
        <div>
          <dt className="text-[9px] font-medium uppercase tracking-widest text-os-dim/80">
            Active agents
          </dt>
          <dd className="text-xs text-os-green">{activeCount}</dd>
        </div>
      </dl>
      {latest && (
        <ExpandableText
          text={`Latest: ${latest}`}
          maxLines={2}
          className="mt-1.5 text-[11px] leading-snug text-os-green/85"
        />
      )}
    </motion.aside>
  );
});

const WorkspaceTelemetry = memo(function WorkspaceTelemetry() {
  const kernel = useOsStore((s) => s.kernel);
  const selectedModelId = useOsStore((s) => s.selectedModelId);
  const graph = useOsStore((s) => s.graph);
  const usage = kernel.lastUsage;
  const hb = kernel.heartbeat;
  const model = openRouterModelById(selectedModelId);
  const isFree = model?.id.includes("free") ?? selectedModelId.includes("free");
  const modelShort = selectedModelId.split("/").pop() ?? selectedModelId;
  const tokensLabel = usage
    ? `${usage.promptTokens}+${usage.completionTokens}`
    : null;
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

  const statusTone =
    status === "online"
      ? "text-os-green"
      : status === "degraded"
        ? "text-os-amber"
        : "text-os-fault";

  return (
    <footer
      aria-label="Workspace telemetry"
      className="flex shrink-0 flex-col gap-1.5 border-t border-os-border/60 bg-os-panel/35 px-3 py-2 font-mono text-[10px] text-os-dim"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full",
                kernel.connected ? "workspace-telemetry-live bg-os-green" : "bg-os-fault/80"
              )}
              aria-hidden
            />
            <span className={cn("capitalize", statusTone)}>{status}</span>
            {uptimeSec != null && (
              <span className="text-os-dim/80">
                {Math.floor(uptimeSec / 60)}m{uptimeSec % 60}s
              </span>
            )}
          </span>
          <span>
            Model{" "}
            <span className="text-os-green">
              {modelShort}
              {isFree ? " · free" : ""}
            </span>
          </span>
          {tokensLabel && (
            <span className={usageFlash ? "workspace-telemetry-flash" : undefined}>
              Tokens <span className="text-os-green">{tokensLabel}</span>
            </span>
          )}
        </div>

        {(graph.taskId || graph.activeNodeIds.size > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {graph.taskId && (
              <span className="break-all text-os-green/80">Task {graph.taskId}</span>
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
        )}
      </div>
    </footer>
  );
});

export function WorkspaceMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  const lastCommand = useOsStore((s) => s.kernel.lastCommand);
  const graph = useOsStore((s) => s.graph);
  const cpu = useOsStore((s) => s.cpu);
  const hasActivity =
    Boolean(lastCommand) ||
    Boolean(graph.taskId) ||
    graph.activeNodeIds.size > 0 ||
    cpu.pipeline.currentStep !== null ||
    cpu.pipeline.completedSteps.length > 0;

  const [graphOpen, setGraphOpen] = useState(true);

  const panels = useMemo(
    () =>
      buildOsPanels(hydraConfigured, {
        showHeader: false,
        compactShell: true,
        hideCreateAgent: false,
      }),
    [hydraConfigured]
  );

  return (
    <div className="workspace-mode flex h-full min-h-0 flex-col overflow-hidden bg-os-bg font-mono text-os-green">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(74,222,128,0.05),_transparent_55%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 sm:p-3">
        <WorkspaceDemoBar compact={hasActivity} />

        <AnimatePresence initial={false}>
          {hasActivity && <TaskOutcomeBar key="task-outcome" />}
        </AnimatePresence>

        <div
          className={cn(
            "grid min-h-0 flex-1 gap-2 grid-cols-1",
            "lg:grid-rows-[minmax(0,1.55fr)_minmax(130px,0.45fr)]",
            graphOpen
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.3fr)]"
              : "lg:grid-cols-[minmax(0,1fr)_2.25rem]"
          )}
        >
          <WorkspacePanel
            title="Your task"
            id="devfactory-active-task"
            variant="primary"
            className={cn(
              "min-h-[240px] lg:min-h-0",
              graphOpen ? "lg:col-start-1 lg:row-start-1" : "lg:row-start-1"
            )}
          >
            {panels.cpu}
          </WorkspacePanel>

          <aside
            className={cn(
              "flex min-h-0 flex-col",
              graphOpen ? "min-h-[120px] lg:col-start-2 lg:row-start-1" : "hidden"
            )}
          >
            <WorkspacePanel
              title="Agents at work"
              id="devfactory-agent-graph"
              variant="secondary"
              className="min-h-0 flex-1"
              headerAction={
                <button
                  type="button"
                  onClick={() => setGraphOpen(false)}
                  className="shrink-0 rounded border border-os-border/50 p-0.5 text-os-dim transition-colors hover:border-os-green/40 hover:text-os-green"
                  aria-label="Hide agent graph"
                  title="Hide agent graph"
                >
                  <ChevronRight className="size-3" aria-hidden />
                </button>
              }
            >
              {panels.agentGraph}
            </WorkspacePanel>
          </aside>

          {!graphOpen && (
            <button
              type="button"
              onClick={() => setGraphOpen(true)}
              className="hidden min-h-0 shrink-0 items-center justify-center self-stretch rounded-lg border border-os-border/40 bg-os-panel/20 text-os-dim transition-colors hover:border-os-green/35 hover:text-os-green lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex"
              aria-label="Show agent graph"
              title="Show agent graph"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </button>
          )}

          <WorkspacePanel
            title="Run a command"
            id="devfactory-shell"
            variant="secondary"
            className={cn(
              "min-h-[140px] shrink-0 lg:row-start-2",
              graphOpen ? "lg:col-span-2" : "lg:col-span-1"
            )}
          >
            <div className="workspace-shell-host flex h-full min-h-0 flex-col overflow-auto rounded-lg bg-os-bg/80 max-h-[220px] lg:max-h-none">
              {panels.shell}
            </div>
          </WorkspacePanel>
        </div>

        <AnimatePresence initial={false}>
          {hasActivity && (
            <motion.div
              key="resource-strip"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden"
              aria-label="Background activity"
            >
              <div className="grid shrink-0 grid-cols-3 gap-1.5 pt-0.5">
                <WorkspacePanel
                  title="Memory"
                  id="devfactory-memory"
                  variant="muted"
                  className="min-h-[64px]"
                >
                  {panels.memory}
                </WorkspacePanel>
                <WorkspacePanel title="Compute" variant="muted" className="min-h-[64px]">
                  {panels.gpu}
                </WorkspacePanel>
                <WorkspacePanel title="Tools" variant="muted" className="min-h-[64px]">
                  {panels.io}
                </WorkspacePanel>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sr-only" aria-hidden>
          {panels.configure}
        </div>
      </div>
      <WorkspaceTelemetry />
    </div>
  );
}
