"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Sparkles, X } from "lucide-react";
import { ComicText } from "@/components/ui/comic-text";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_DEMO_COMMANDS,
  dismissWorkspaceFirstRun,
  isWorkspaceFirstRunDismissed,
  runWorkspaceDemo,
} from "@/lib/os/workspace-demo";

const DEMO_CHIPS = [
  {
    label: "Build REST API",
    hint: "Full CPU pipeline → GPU dispatch",
    command: WORKSPACE_DEMO_COMMANDS.submitRestApi,
  },
  {
    label: "Spawn planner",
    hint: "cpu.plan agent on graph",
    command: WORKSPACE_DEMO_COMMANDS.spawnPlanner,
  },
] as const;

const FIRST_RUN_STEPS = [
  "Tap Try this or type a command in Run a command below",
  "Follow Your task — status, pipeline, and latest update",
  "Peek at Agents at work on the side when you want detail",
] as const;

export const WorkspaceDemoBar = memo(function WorkspaceDemoBar({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [runningCommand, setRunningCommand] = useState<string | null>(null);

  useEffect(() => {
    if (compact) return;
    setShowFirstRun(!isWorkspaceFirstRunDismissed());
  }, [compact]);

  const dismissFirstRun = useCallback(() => {
    dismissWorkspaceFirstRun();
    setShowFirstRun(false);
  }, []);

  const onRunDemo = useCallback((command: string) => {
    setRunningCommand(command);
    runWorkspaceDemo(command);
    window.setTimeout(() => setRunningCommand(null), 2400);
  }, []);

  return (
    <div className="workspace-demo-bar shrink-0 space-y-2">
      <AnimatePresence initial={false}>
        {showFirstRun && !compact && (
          <motion.aside
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-xl border border-os-amber/30 bg-gradient-to-r from-os-amber/10 via-os-panel/50 to-os-green/5 p-2.5"
            aria-label="First run guide"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <ComicText fontSize={1.2} className="text-left text-os-amber">
                  First run — watch an agent work
                </ComicText>
                <ol className="mt-1.5 space-y-1 text-[11px] leading-snug text-os-green/90">
                  {FIRST_RUN_STEPS.map((step, i) => (
                    <li key={step} className="flex gap-2">
                      <span className="shrink-0 font-mono text-os-amber/90">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <RippleButton
                type="button"
                onClick={dismissFirstRun}
                className="shrink-0 rounded-md border border-os-border/60 p-1 text-os-dim transition-colors hover:border-os-amber/40 hover:text-os-amber"
                aria-label="Dismiss first run guide"
              >
                <X className="size-3.5" aria-hidden />
              </RippleButton>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border border-os-border/70 bg-os-panel/40 backdrop-blur-sm",
          compact ? "px-2 py-1" : "px-2.5 py-2"
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-os-dim">
          <Sparkles className="size-3 text-os-amber" aria-hidden />
          <ComicText fontSize={1.1} className="text-left text-os-dim">
            Try this
          </ComicText>
        </span>
        {!compact && (
          <p className="hidden text-[10px] text-os-dim/90 sm:inline">
            One click — agent runs a real task you can verify in terminal
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {DEMO_CHIPS.map((chip) => {
            const isRunning = runningCommand === chip.command;
            return (
              <RippleButton
                key={chip.command}
                type="button"
                title={chip.hint}
                disabled={isRunning}
                onClick={() => onRunDemo(chip.command)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition-[background-color,border-color,box-shadow,opacity]",
                  isRunning
                    ? "workspace-demo-chip-running border-os-amber/60 bg-os-amber/15 text-os-amber"
                    : "border-os-green/35 bg-os-bg/40 text-os-green hover:border-os-amber/45 hover:bg-os-amber/10 hover:text-os-amber"
                )}
              >
                <Play className="size-3 shrink-0" aria-hidden />
                <ComicText fontSize={1.1} className="text-left text-os-green">
                  {chip.label}
                </ComicText>
              </RippleButton>
            );
          })}
        </div>
      </div>
    </div>
  );
});
