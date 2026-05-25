"use client";

import { useEffect } from "react";
import "./workspace-ux.css";
import { WorkspaceAgentList } from "@/components/modes/WorkspaceAgentList";
import { WorkspaceAgentFeed } from "@/components/modes/WorkspaceAgentFeed";
import { WorkspacePipeline } from "@/components/modes/WorkspacePipeline";
import { useOsStore } from "@/store/os/osStore";

export function WorkspaceMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  return (
    <div
      className="workspace-mode relative flex h-full min-h-0 flex-col overflow-hidden bg-os-bg/70 font-mono text-os-green"
      style={{ "--workspace-accent": "#00FFB2" } as React.CSSProperties}
      id="devfactory-active-task"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in srgb, var(--workspace-accent) 6%, transparent), transparent 55%)",
        }}
      />

      <div
        className="workspace-grid relative z-10 grid min-h-0 flex-1 gap-3 overflow-hidden p-3"
        style={{
          gridTemplateColumns: "minmax(0, 25fr) minmax(0, 50fr) minmax(0, 25fr)",
        }}
      >
        <div className="min-h-0">
          <WorkspaceAgentList hydraConfigured={hydraConfigured} />
        </div>
        <div className="min-h-0" id="devfactory-agent-graph">
          <WorkspacePipeline />
        </div>
        <div className="min-h-0">
          <WorkspaceAgentFeed />
        </div>
      </div>
    </div>
  );
}
