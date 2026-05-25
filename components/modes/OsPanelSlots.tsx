"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { KernelBar } from "@/components/panels/KernelBar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { OsPanelSkeleton } from "@/components/ui/os-panel-skeleton";

const AgentGraphPanel = dynamic(
  () => import("@/components/graph/AgentGraphPanel").then((m) => m.AgentGraphPanel),
  {
    ssr: false,
    loading: () => (
      <OsPanelSkeleton variant="graph" className="h-full min-h-[120px]" />
    ),
  }
);

const CpuScheduler = dynamic(
  () => import("@/components/panels/CpuScheduler").then((m) => m.CpuScheduler),
  { ssr: false }
);

const HydraMemoryPanel = dynamic(
  () => import("@/components/panels/HydraMemoryPanel").then((m) => m.HydraMemoryPanel),
  { ssr: false }
);

const IoBus = dynamic(
  () => import("@/components/panels/IoBus").then((m) => m.IoBus),
  { ssr: false }
);

const GpuHeatmap = dynamic(
  () => import("@/components/panels/GpuHeatmap").then((m) => m.GpuHeatmap),
  { ssr: false }
);

const ConfigurePanel = dynamic(
  () => import("@/components/panels/ConfigurePanel").then((m) => m.ConfigurePanel),
  { ssr: false }
);

const XtermShell = dynamic(
  () => import("@/components/shell/XtermShell").then((m) => m.XtermShell),
  {
    ssr: false,
    loading: () => (
      <OsPanelSkeleton className="h-full min-h-[160px]" />
    ),
  }
);

export interface OsPanelSet {
  kernel: ReactNode;
  configure: ReactNode;
  agentGraph: ReactNode;
  cpu: ReactNode;
  memory: ReactNode;
  io: ReactNode;
  gpu: ReactNode;
  shell: ReactNode;
}

export interface BuildOsPanelsOptions {
  showHeader?: boolean;
  /** Workspace panel: skip xterm welcome banner, jump to prompt */
  compactShell?: boolean;
  /** Workspace system strip: summary-first memory panel */
  compactMemory?: boolean;
  hideCreateAgent?: boolean;
}

export function buildOsPanels(
  hydraConfigured: boolean,
  options?: BuildOsPanelsOptions
): OsPanelSet {
  const showHeader = options?.showHeader ?? true;
  const compactShell = options?.compactShell ?? false;
  const compactMemory = options?.compactMemory ?? false;
  const hideCreateAgent = options?.hideCreateAgent ?? false;
  return {
    kernel: <KernelBar />,
    configure: <ConfigurePanel />,
    agentGraph: (
      <ErrorBoundary label="Agent graph">
        <AgentGraphPanel
          hydraConfigured={hydraConfigured}
          showHeader={showHeader}
          hideCreateAgent={hideCreateAgent}
        />
      </ErrorBoundary>
    ),
    cpu: <CpuScheduler showHeader={showHeader} />,
    memory: <HydraMemoryPanel showHeader={showHeader} compact={compactMemory} />,
    io: <IoBus showHeader={showHeader} />,
    gpu: <GpuHeatmap showHeader={showHeader} />,
    shell: (
      <XtermShell hydraConfigured={hydraConfigured} compact={compactShell} />
    ),
  };
}
