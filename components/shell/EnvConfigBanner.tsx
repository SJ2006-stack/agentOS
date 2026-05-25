"use client";

import { withBasePath } from "@/lib/api/url";
import { isVercelDeployment } from "@/lib/config/deploy-hint";
import type { OsEnvStatus } from "@/lib/env-types";

export function EnvConfigBanner({ envStatus }: { envStatus: OsEnvStatus }) {
  if (envStatus.missingRequired.length === 0) return null;

  const onVercel = isVercelDeployment();
  const verifyPath = withBasePath("/api/os/verify");

  return (
    <div
      className="shrink-0 border-b border-os-fault/30 bg-os-fault/5 px-4 py-2 font-mono text-[11px]"
      role="status"
    >
      <span className="text-os-fault">Missing env keys:</span>{" "}
      <span className="text-os-dim">
        {envStatus.missingRequired.join(", ")} —{" "}
        {onVercel ? (
          <>
            set them in Vercel → Project → Settings → Environment Variables
            (Production), redeploy, then check{" "}
            <span className="text-os-green">{verifyPath}</span>
          </>
        ) : (
          <>
            copy <span className="text-os-green">.env.example</span> to{" "}
            <span className="text-os-green">.env.local</span> and restart the dev
            server
          </>
        )}
      </span>
    </div>
  );
}
