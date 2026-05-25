"use client";

import { AgentOsShell } from "@/components/AgentOsShell";

/** @deprecated Use AgentOsShell — kept for imports */
export function OsModeRouter({ hydraConfigured }: { hydraConfigured: boolean }) {
  return <AgentOsShell hydraConfigured={hydraConfigured} />;
}
