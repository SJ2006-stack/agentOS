"use client";

import { motion } from "motion/react";
import { ComicText } from "@/components/ui/comic-text";
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
      className="flex flex-col gap-1 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <ComicText fontSize={1.5} className="text-left text-os-amber">
            DEVFACTORY OS
          </ComicText>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`inline-flex items-center gap-1 capitalize ${statusClass(status)}`}
          >
            <span aria-hidden>●</span>
            <ComicText fontSize={1.1} className={`inline text-left ${statusClass(status)}`}>
              {status}
            </ComicText>
          </motion.span>
          {uptime != null && (
            <ComicText fontSize={1} className="inline text-left text-os-dim">
              {uptime}
            </ComicText>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-os-dim">
          <span title={selectedModelId}>
            <ComicText fontSize={1} className="inline text-left text-os-dim">
              {`Model ${truncateModelId(selectedModelId)}`}
            </ComicText>
          </span>
          {usage && (
            <span title="Last OpenRouter usage">
              <ComicText fontSize={1} className="inline text-left text-os-dim">
                {`Tokens ${usage.promptTokens}+${usage.completionTokens}`}
              </ComicText>
            </span>
          )}
        </div>
      </div>

      {integrations.length > 0 && (
        <div className="flex flex-wrap gap-x-3 text-[10px] text-os-dim/70">
          {integrations.map(({ label, value }) => (
            <span key={label}>
              <ComicText fontSize={1} className="inline text-left text-os-dim">
                {`${label} ${value}`}
              </ComicText>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
