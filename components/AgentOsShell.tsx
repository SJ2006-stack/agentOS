"use client";

import { useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { AgentOsHero } from "@/components/hero/AgentOsHero";
import { HeroBootSequence } from "@/components/hero/BootSequence";
import { DevFactoryDock } from "@/components/DevFactoryDock";
import { DesktopMode } from "@/components/modes/DesktopMode";
import { TerminalMode } from "@/components/modes/TerminalMode";
import { WorkspaceMode } from "@/components/modes/WorkspaceMode";
import { useKernelHeartbeat } from "@/hooks/useKernelHeartbeat";
import { useOsRealtime } from "@/hooks/useOsRealtime";
import { useOsStore } from "@/store/osStore";
import { useUiModeStore } from "@/store/uiModeStore";
import { cn } from "@/lib/utils";

const MODE_TRANSITION = { duration: 0.35, ease: "easeInOut" as const };

export function AgentOsShell({ hydraConfigured }: { hydraConfigured: boolean }) {
  const mode = useUiModeStore((s) => s.mode);
  const hydrated = useUiModeStore((s) => s.hydrated);
  const workspaceLocked = useUiModeStore((s) => s.workspaceLocked);
  const setWorkspaceLocked = useUiModeStore((s) => s.setWorkspaceLocked);
  const bootComplete = useOsStore((s) => s.bootComplete);
  const heroBootEnabled = useOsStore((s) => s.heroBootEnabled);
  const setBootComplete = useOsStore((s) => s.setBootComplete);

  useOsRealtime(hydraConfigured);
  useKernelHeartbeat();

  useEffect(() => {
    useOsStore.getState().hydrateModelFromStorage();
    useOsStore.getState().hydrateHeroBootFromStorage();
    useUiModeStore.getState().hydrateFromStorage();
  }, []);

  useEffect(() => {
    useOsStore.getState().setConfigFlags(hydraConfigured, false);
  }, [hydraConfigured]);

  useEffect(() => {
    if (hydraConfigured) {
      void fetch("/api/hydradb/boot", { method: "POST" });
    }
  }, [hydraConfigured]);

  const finishBoot = useCallback(() => {
    setBootComplete(true);
  }, [setBootComplete]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-os-bg font-mono text-os-dim">
        AgentOS…
      </div>
    );
  }

  if (mode === "hero" && heroBootEnabled && !bootComplete) {
    return <HeroBootSequence onComplete={finishBoot} onSkip={finishBoot} />;
  }

  const showOrchestrationStrip = mode !== "hero";
  const showActiveWorkspace = mode !== "hero";

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-os-bg font-mono text-os-green">
      {showOrchestrationStrip && <AgentOsHero variant="strip" />}

      {showActiveWorkspace && (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-os-border/50 px-3 py-1">
            <p className="text-center text-[9px] uppercase tracking-[0.35em] text-os-dim">
              Active workspace
            </p>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden pb-28">
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{
                opacity: mode === "terminal" ? 1 : 0,
                pointerEvents: mode === "terminal" ? "auto" : "none",
              }}
              transition={MODE_TRANSITION}
              aria-hidden={mode !== "terminal"}
            >
              <TerminalMode hydraConfigured={hydraConfigured} />
            </motion.div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{
                opacity: mode === "workspace" ? 1 : 0,
                pointerEvents: mode === "workspace" ? "auto" : "none",
              }}
              transition={MODE_TRANSITION}
              aria-hidden={mode !== "workspace"}
            >
              <WorkspaceMode hydraConfigured={hydraConfigured} />
              {mode === "workspace" && workspaceLocked && (
                <WorkspaceLockOverlay onUnlock={() => setWorkspaceLocked(false)} />
              )}
            </motion.div>

            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{
                opacity: mode === "desktop" ? 1 : 0,
                pointerEvents: mode === "desktop" ? "auto" : "none",
              }}
              transition={MODE_TRANSITION}
              aria-hidden={mode !== "desktop"}
            >
              <DesktopMode />
            </motion.div>
          </div>
        </div>
      )}

      <motion.div
        className="absolute inset-0 z-20"
        initial={false}
        animate={{
          opacity: mode === "hero" ? 1 : 0,
          pointerEvents: mode === "hero" ? "auto" : "none",
        }}
        transition={MODE_TRANSITION}
        aria-hidden={mode !== "hero"}
      >
        <AgentOsHero variant="fullscreen" />
      </motion.div>

      <DevFactoryDock />
    </div>
  );
}

function WorkspaceLockOverlay({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-30 flex items-center justify-center",
        "bg-gradient-to-b from-os-bg/40 via-os-bg/70 to-os-bg/90 backdrop-blur-[2px]"
      )}
      role="dialog"
      aria-label="Workspace locked"
    >
      <button
        type="button"
        onClick={onUnlock}
        className={cn(
          "group flex flex-col items-center gap-3 rounded-2xl border border-os-border/80 px-10 py-8",
          "bg-gradient-to-br from-os-panel/90 via-os-panel/70 to-os-bg/80 shadow-2xl backdrop-blur-md",
          "transition-all hover:border-os-amber/60"
        )}
      >
        <span className="text-[10px] uppercase tracking-[0.35em] text-os-dim">locked</span>
        <span className="text-lg font-medium text-os-green group-hover:text-os-amber">
          Unlock workspace
        </span>
      </button>
    </div>
  );
}
