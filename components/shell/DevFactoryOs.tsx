"use client";

import { AgentOsShell } from "@/components/shell/AgentOsShell";

export function DevFactoryOs({ hydraConfigured }: { hydraConfigured: boolean }) {
  return <AgentOsShell hydraConfigured={hydraConfigured} />;
}
