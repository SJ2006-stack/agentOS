"use client";

import { AgentOsShell } from "@/components/AgentOsShell";

export function DevFactoryOs({ hydraConfigured }: { hydraConfigured: boolean }) {
  return <AgentOsShell hydraConfigured={hydraConfigured} />;
}
