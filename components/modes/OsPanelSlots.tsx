"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { KernelBar } from "@/components/KernelBar";
import { CpuScheduler } from "@/components/CpuScheduler";
import { HydraMemoryPanel } from "@/components/HydraMemoryPanel";
import { IoBus } from "@/components/IoBus";
import { AgentGraphPanel } from "@/components/AgentGraphPanel";
import { GpuHeatmap } from "@/components/GpuHeatmap";
import { ConfigurePanel } from "@/components/ConfigurePanel";

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

export function buildOsPanels(hydraConfigured: boolean): OsPanelSet {
  return {
    kernel: <KernelBar />,
    configure: <ConfigurePanel />,
    agentGraph: <AgentGraphPanel hydraConfigured={hydraConfigured} />,
    cpu: <CpuScheduler />,
    memory: <HydraMemoryPanel />,
    io: <IoBus />,
    gpu: <GpuHeatmap />,
    shell: <XtermShell hydraConfigured={hydraConfigured} />,
  };
}
