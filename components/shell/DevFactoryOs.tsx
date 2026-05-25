"use client";

import { AgentOsShell } from "@/components/shell/AgentOsShell";
import type { OsEnvStatus } from "@/lib/env-types";

export function DevFactoryOs({ envStatus }: { envStatus: OsEnvStatus }) {
  return <AgentOsShell envStatus={envStatus} />;
}
