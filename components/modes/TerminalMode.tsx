"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OsLayout } from "@/components/layout/OsLayout";
import { buildOsPanels } from "@/components/modes/OsPanelSlots";
import { AGENT_SPAWNED_EVENT, type AgentSpawnedDetail } from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";

export function TerminalMode({ hydraConfigured }: { hydraConfigured: boolean }) {
  const [spawnFlash, setSpawnFlash] = useState<string | null>(null);
  const panels = buildOsPanels(hydraConfigured);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<AgentSpawnedDetail>).detail;
      const label = detail?.templateId?.split(".").pop() ?? "agent";
      setSpawnFlash(`▶ spawn · ${label}`);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setSpawnFlash(null), 2200);
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onSpawn);
    return () => {
      window.removeEventListener(AGENT_SPAWNED_EVENT, onSpawn);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      className={cn(
        "terminal-mode relative h-full min-h-0 w-full overflow-hidden",
        "bg-[#030303] text-os-green"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#000_100%)] opacity-80" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)]" />
      <div className="relative z-10 h-full w-full [&_.bg-os-bg]:bg-[#050805]">
        <OsLayout
          hydraConfigured={hydraConfigured}
          variant="terminal"
          kernel={panels.kernel}
          configure={panels.configure}
          agentGraph={panels.agentGraph}
          cpu={panels.cpu}
          memory={panels.memory}
          io={panels.io}
          gpu={panels.gpu}
          shell={panels.shell}
        />
      </div>
      <AnimatePresence>
        {spawnFlash && (
          <motion.div
            key={spawnFlash}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-x-0 top-1/3 z-50 flex justify-center px-4"
          >
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-os-amber/90 drop-shadow-lg">
              {spawnFlash}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
