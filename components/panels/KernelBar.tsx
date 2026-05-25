"use client";

import { motion } from "motion/react";
import { useOsStore } from "@/store/os/osStore";

function truncateModelId(id: string, max = 22): string {
  const short = id.includes("/") ? (id.split("/").pop() ?? id) : id;
  if (short.length <= max) return short;
  return `${short.slice(0, max - 1)}…`;
}

function statusClass(status: string): string {
  if (status === "online") return "text-os-green";
  if (status === "degraded") return "text-os-amber";
  return "text-os-fault";
}

export function KernelBar() {
  const { kernel, supabaseConfigured, hydraConfigured, selectedModelId } =
    useOsStore();
  const usage = kernel.lastUsage;
  const hb = kernel.heartbeat;
  const uptime = hb ? `${Math.floor(hb.uptimeMs / 1000)}s` : null;
  const status = kernel.connected ? (hb?.status ?? "online") : "offline";

  const integrations: { label: string; value: string }[] = [];
  if (supabaseConfigured) integrations.push({ label: "RT", value: "linked" });
  if (hydraConfigured) integrations.push({ label: "Hydra", value: "live" });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-2 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-left text-os-amber">
            DEVFACTORY OS
          </span>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`inline-flex items-center gap-1 capitalize ${statusClass(status)}`}
          >
            <span aria-hidden>●</span>
            <span className={`inline text-left ${statusClass(status)}`}>
              {status}
            </span>
          </motion.span>
          {uptime != null && (
            <span className="inline text-left text-os-dim">
              {uptime}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-os-dim">
          <span title={selectedModelId}>
            <span className="inline text-left text-os-dim">
              {`Model ${truncateModelId(selectedModelId)}`}
            </span>
          </span>
          {usage && (
            <span title="Last Gemini usage">
              <span className="inline text-left text-os-dim">
                {`Tokens ${usage.promptTokens}+${usage.completionTokens}`}
              </span>
            </span>
          )}
        </div>
      </div>

      {integrations.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-os-dim/70">
          {integrations.map(({ label, value }) => (
            <span key={label}>
              <span className="inline text-left text-os-dim">
                {`${label} ${value}`}
              </span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
