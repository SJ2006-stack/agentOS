"use client";

import { motion } from "motion/react";
import { useOsStore } from "@/store/osStore";

export function KernelBar() {
  const { kernel, supabaseConfigured, hydraConfigured } = useOsStore();
  const hb = kernel.heartbeat;
  const uptime = hb ? `${Math.floor(hb.uptimeMs / 1000)}s` : "—";
  const status = kernel.connected ? (hb?.status ?? "online") : "offline";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-wrap items-center justify-between gap-2 text-xs"
    >
      <div className="flex items-center gap-3">
        <span className="text-os-amber font-bold tracking-widest">DEVFACTORY OS</span>
        <span className="text-os-dim">kernel</span>
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={
            status === "online"
              ? "text-os-green"
              : status === "degraded"
                ? "text-os-amber"
                : "text-os-fault"
          }
        >
          ● {status}
        </motion.span>
        <span className="text-os-dim">uptime {uptime}</span>
      </div>
      <div className="flex gap-4 text-os-dim">
        <span>RT {supabaseConfigured ? "linked" : "offline"}</span>
        <span>Hydra {hydraConfigured ? "live" : "disconnected"}</span>
        {kernel.lastCommand && (
          <span className="text-os-green truncate max-w-xs">
            last: {kernel.lastCommand}
          </span>
        )}
      </div>
    </motion.div>
  );
}
