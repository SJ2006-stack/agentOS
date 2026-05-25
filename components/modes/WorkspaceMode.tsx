"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import "./workspace-ux.css";
import { WorkspaceAgentList } from "@/components/modes/WorkspaceAgentList";
import { WorkspaceAgentFeed } from "@/components/modes/WorkspaceAgentFeed";
import { WorkspacePipeline } from "@/components/modes/WorkspacePipeline";
import { WorkspaceDemoBar } from "@/components/modes/WorkspaceDemoBar";
import { BuildCanvas } from "@/components/build/BuildCanvas";
import { DeployReveal } from "@/components/build/DeployReveal";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { OsPanelSkeleton } from "@/components/ui/os-panel-skeleton";
import { useOsStore } from "@/store/os/osStore";

const AgentGraphPanel = dynamic(
  () =>
    import("@/components/graph/AgentGraphPanel").then((m) => m.AgentGraphPanel),
  {
    ssr: false,
    loading: () => <OsPanelSkeleton variant="graph" className="h-full min-h-[200px]" />,
  }
);

export function WorkspaceMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  const buildActive = useOsStore((s) => s.build.buildActive);

  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  return (
    <div
      className="workspace-mode relative flex h-full min-h-0 flex-col overflow-hidden bg-os-bg/70 font-mono text-os-green"
      style={{ "--workspace-accent": "#00FFB2" } as React.CSSProperties}
    >
      <DeployReveal />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in srgb, var(--workspace-accent) 6%, transparent), transparent 55%)",
        }}
      />

      <div className="relative z-10 shrink-0 px-4 pt-3">
        <WorkspaceDemoBar />
      </div>

      <div className="workspace-grid relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 pt-3 md:grid-cols-2 xl:grid-cols-[minmax(0,22fr)_minmax(0,56fr)_minmax(0,22fr)] xl:overflow-hidden">
        <div className="min-h-0 min-w-0 md:order-2 xl:order-none">
          <WorkspaceAgentList hydraConfigured={hydraConfigured} />
        </div>

        <div
          className="flex min-h-0 min-w-0 flex-col gap-4 md:order-1 md:col-span-2 xl:order-none xl:col-span-1"
          id="devfactory-orchestration-hero"
        >
          <section
            id="devfactory-agent-graph"
            className="workspace-hero-graph workspace-card flex min-h-0 flex-[1.35] flex-col overflow-hidden rounded-xl border border-[color:var(--workspace-accent)]/25 bg-white/[0.06] shadow-[0_0_32px_color-mix(in_srgb,var(--workspace-accent)_12%,transparent)] backdrop-blur"
            aria-label="Agent orchestration graph"
          >
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-white/10 px-4 py-3">
              <span className="min-w-0 text-left leading-snug text-os-green/90">
                Orchestration graph
              </span>
              <span className="shrink-0 text-left text-[10px] leading-snug text-os-dim/80">
                click a node to spawn
              </span>
            </header>
            <div className="min-h-0 flex-1 p-3">
              <ErrorBoundary label="Agent graph">
                <AgentGraphPanel
                  hydraConfigured={hydraConfigured}
                  showHeader={false}
                  hideCreateAgent
                />
              </ErrorBoundary>
            </div>
          </section>

          <div className="min-h-0 flex-1" id="devfactory-active-task">
            {buildActive ? <BuildCanvas /> : <WorkspacePipeline />}
          </div>
        </div>

        <div className="min-h-0 min-w-0 md:order-3 xl:order-none">
          <WorkspaceAgentFeed />
        </div>
      </div>
    </div>
  );
}
