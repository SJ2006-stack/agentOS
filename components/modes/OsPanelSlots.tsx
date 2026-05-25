"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { KernelBar } from "@/components/KernelBar";

const AgentGraphPanel = dynamic(
  () => import("@/components/AgentGraphPanel").then((m) => m.AgentGraphPanel),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[120px] animate-pulse rounded bg-os-panel/20" />
    ),
  }
);

const CpuScheduler = dynamic(
  () => import("@/components/CpuScheduler").then((m) => m.CpuScheduler),
  { ssr: false }
);

const HydraMemoryPanel = dynamic(
  () => import("@/components/HydraMemoryPanel").then((m) => m.HydraMemoryPanel),
  { ssr: false }
);

const IoBus = dynamic(
  () => import("@/components/IoBus").then((m) => m.IoBus),
  { ssr: false }
);

const GpuHeatmap = dynamic(
  () => import("@/components/GpuHeatmap").then((m) => m.GpuHeatmap),
  { ssr: false }
);

const ConfigurePanel = dynamic(
  () => import("@/components/ConfigurePanel").then((m) => m.ConfigurePanel),
  { ssr: false }
);

const XtermShell = dynamic(
  () => import("@/components/shell/XtermShell").then((m) => m.XtermShell),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[160px] animate-pulse rounded bg-os-panel/30" />
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
      <AgentGraphPanel
        hydraConfigured={hydraConfigured}
        showHeader={showHeader}
        hideCreateAgent={hideCreateAgent}
      />
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
