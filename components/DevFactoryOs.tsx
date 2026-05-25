"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { OsLayout } from "@/components/layout/OsLayout";
import { KernelBar } from "@/components/KernelBar";
import { CpuScheduler } from "@/components/CpuScheduler";
import { HydraMemoryPanel } from "@/components/HydraMemoryPanel";
import { IoBus } from "@/components/IoBus";
import { AgentGraphPanel } from "@/components/AgentGraphPanel";
import { GpuHeatmap } from "@/components/GpuHeatmap";
import { ConfigurePanel } from "@/components/ConfigurePanel";
import { useKernelHeartbeat } from "@/hooks/useKernelHeartbeat";
import { useOsRealtime } from "@/hooks/useOsRealtime";
import { useOsStore } from "@/store/osStore";

const XtermShell = dynamic(
  () => import("@/components/shell/XtermShell").then((m) => m.XtermShell),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-os-panel/30" /> }
);

export function DevFactoryOs({ hydraConfigured }: { hydraConfigured: boolean }) {
  useOsRealtime(hydraConfigured);
  useKernelHeartbeat();

  useEffect(() => {
    useOsStore.getState().hydrateModelFromStorage();
  }, []);

  useEffect(() => {
    if (hydraConfigured) {
      void fetch("/api/hydradb/boot", { method: "POST" });
    }
  }, [hydraConfigured]);

  return (
    <OsLayout
      hydraConfigured={hydraConfigured}
      kernel={<KernelBar />}
      configure={<ConfigurePanel />}
      agentGraph={<AgentGraphPanel hydraConfigured={hydraConfigured} />}
      cpu={<CpuScheduler />}
      memory={<HydraMemoryPanel />}
      io={<IoBus />}
      gpu={<GpuHeatmap />}
      shell={<XtermShell hydraConfigured={hydraConfigured} />}
    />
  );
}
