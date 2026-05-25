"use client";

import dynamic from "next/dynamic";
import { useOsRealtime } from "@/hooks/useOsRealtime";
import { useKernelHeartbeat } from "@/hooks/useKernelHeartbeat";
import { OsLayout } from "@/components/layout/OsLayout";
import { KernelBar } from "@/components/KernelBar";
import { CpuScheduler } from "@/components/CpuScheduler";
import { HydraMemoryPanel } from "@/components/HydraMemoryPanel";
import { IoBus } from "@/components/IoBus";
import { GpuHeatmap } from "@/components/GpuHeatmap";

const XtermShell = dynamic(
  () => import("@/components/shell/XtermShell").then((m) => m.XtermShell),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-os-panel/30" /> }
);

export function OsMonitor({ hydraConfigured }: { hydraConfigured: boolean }) {
  useOsRealtime(hydraConfigured);
  useKernelHeartbeat();

  return (
    <OsLayout
      hydraConfigured={hydraConfigured}
      kernel={<KernelBar />}
      cpu={<CpuScheduler />}
      memory={<HydraMemoryPanel />}
      io={<IoBus />}
      gpu={<GpuHeatmap />}
      shell={<XtermShell hydraConfigured={hydraConfigured} />}
    />
  );
}
