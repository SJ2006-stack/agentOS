"use client";

import { useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { AgentOsHero } from "@/components/hero/AgentOsHero";
import { HeroBootSequence } from "@/components/hero/BootSequence";
import { DevFactoryDock } from "@/components/DevFactoryDock";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { hydrateThemePreset, ThemePresetPicker } from "@/components/ui/theme-preset-picker";
import { TerminalMode } from "@/components/modes/TerminalMode";
import { WorkspaceMode } from "@/components/modes/WorkspaceMode";
import { useKernelHeartbeat } from "@/hooks/useKernelHeartbeat";
import { useOsRealtime } from "@/hooks/useOsRealtime";
import { useOsStore } from "@/store/osStore";
import { cn } from "@/lib/utils";
import { UI_MODE_LABELS, useUiModeStore } from "@/store/uiModeStore";

const DesktopMode = dynamic(
  () => import("@/components/modes/DesktopMode").then((m) => m.DesktopMode),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-mono text-[10px] text-os-dim">
        desktop…
      </div>
    ),
  }
);

const MODE_TRANSITION = { duration: 0.35, ease: "easeInOut" as const };

export function AgentOsShell({ hydraConfigured }: { hydraConfigured: boolean }) {
  const mode = useUiModeStore((s) => s.mode);
  const hydrated = useUiModeStore((s) => s.hydrated);
  const bootComplete = useOsStore((s) => s.bootComplete);
  const heroBootEnabled = useOsStore((s) => s.heroBootEnabled);
  const setBootComplete = useOsStore((s) => s.setBootComplete);

  useOsRealtime(hydraConfigured);
  useKernelHeartbeat();

  useEffect(() => {
    useOsStore.getState().hydrateModelFromStorage();
    useOsStore.getState().hydrateHeroBootFromStorage();
    useUiModeStore.getState().hydrateFromStorage();
    hydrateThemePreset();
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
      <div className="fixed top-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2">
        <ThemePresetPicker className="rounded-full border border-os-border/80 bg-os-surface/90 px-1.5 py-1 backdrop-blur-sm" />
        <AnimatedThemeToggler
          variant="star"
          fromCenter
          className={cn(
            "!relative !left-auto !top-auto !translate-x-0",
            mode === "hero"
              ? "border-hero-graphite bg-hero-obsidian/90 text-hero-cyan hover:border-hero-cyan/50 hover:text-hero-purple"
              : "border-os-border bg-os-panel/90 text-os-green hover:border-os-green/50 hover:bg-os-panel hover:text-os-amber"
          )}
        />
      </div>
      {showOrchestrationStrip && <AgentOsHero variant="strip" />}

      {showActiveWorkspace && (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-os-border/50 px-3 py-1">
            <p className="text-center text-[10px] font-medium uppercase tracking-widest text-os-dim">
              {UI_MODE_LABELS[mode]}
            </p>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden pb-28">
            {mode === "terminal" && (
              <motion.div
                key="terminal"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={MODE_TRANSITION}
              >
                <TerminalMode hydraConfigured={hydraConfigured} />
              </motion.div>
            )}

            {mode === "workspace" && (
              <motion.div
                key="workspace"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={MODE_TRANSITION}
              >
                <WorkspaceMode hydraConfigured={hydraConfigured} />
              </motion.div>
            )}

            {mode === "desktop" && (
              <motion.div
                key="desktop"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={MODE_TRANSITION}
              >
                <DesktopMode />
              </motion.div>
            )}
          </div>
        </div>
      )}

      {mode === "hero" && (
        <motion.div
          key="hero"
          className="absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={MODE_TRANSITION}
        >
          <AgentOsHero variant="fullscreen" />
        </motion.div>
      )}

      <DevFactoryDock />
    </div>
  );
}
