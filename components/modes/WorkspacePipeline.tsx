"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MissionPipeline } from "@/components/pipeline/MissionPipeline";
import { AGENT_SPAWNED_EVENT, type AgentSpawnedDetail } from "@/lib/os/shell-events";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

const STAGE_ICON: Record<CpuStep, string> = {
  INTAKE: "📥",
  PLAN: "🧭",
  ROUTE: "🛣️",
  DISPATCH: "🚀",
  VERIFY: "🔍",
  COMMIT: "✅",
};

const STAGE_TITLE: Record<CpuStep, string> = {
  INTAKE: "Intake",
  PLAN: "Plan",
  ROUTE: "Route",
  DISPATCH: "Dispatch",
  VERIFY: "Verify",
  COMMIT: "Commit",
};

const STAGE_DESCRIPTION: Record<CpuStep, string> = {
  INTAKE: "Understanding your request and capturing intent.",
  PLAN: "Breaking the task into concrete subtasks.",
  ROUTE: "Choosing the right agents and tools for the job.",
  DISPATCH: "Spawning workers and handing off the plan.",
  VERIFY: "Reviewing results before commit.",
  COMMIT: "Writing the final summary to shared memory.",
};

const STAGE_PLACEHOLDER: Record<CpuStep, string> = {
  INTAKE: "Request received",
  PLAN: "Plan ready · subtasks queued",
  ROUTE: "Routes resolved",
  DISPATCH: "Workers dispatched",
  VERIFY: "Output verified",
  COMMIT: "Result committed to memory",
};

const MISSION_PIPELINE_STAGES = CPU_STEPS.map((step) => ({
  name: step,
  icon: STAGE_ICON[step],
}));

function shortMemoryPreview(text: string | null, maxLen = 140): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function ThinkingDots() {
  return (
    <span
      className="workspace-thinking inline-flex items-center gap-1"
      aria-label="Thinking"
    >
      <span className="workspace-thinking-dot" />
      <span className="workspace-thinking-dot" />
      <span className="workspace-thinking-dot" />
    </span>
  );
}

export const WorkspacePipeline = memo(function WorkspacePipeline() {
  const currentStep = useOsStore((s) => s.cpu.pipeline.currentStep);
  const completedSteps = useOsStore((s) => s.cpu.pipeline.completedSteps);
  const lastMessage = useOsStore((s) => s.cpu.lastMessage);
  const memorySlots = useOsStore((s) => s.memory.slots);
  const [spawnTick, setSpawnTick] = useState(false);

  useEffect(() => {
    let clearId: ReturnType<typeof setTimeout> | undefined;
    const onSpawn = (e: Event) => {
      const detail = (e as CustomEvent<AgentSpawnedDetail>).detail;
      if (!detail?.templateId) return;
      setSpawnTick(true);
      if (clearId) clearTimeout(clearId);
      clearId = setTimeout(() => setSpawnTick(false), 1400);
    };
    window.addEventListener(AGENT_SPAWNED_EVENT, onSpawn);
    return () => {
      window.removeEventListener(AGENT_SPAWNED_EVENT, onSpawn);
      if (clearId) clearTimeout(clearId);
    };
  }, []);

  const activeIndex = useMemo(() => {
    if (currentStep) return CPU_STEPS.indexOf(currentStep);
    if (completedSteps.length > 0) {
      const lastDone = completedSteps[completedSteps.length - 1];
      return CPU_STEPS.indexOf(lastDone);
    }
    return -1;
  }, [currentStep, completedSteps]);

  const displayedStage: CpuStep | null = currentStep
    ? currentStep
    : completedSteps.length > 0
      ? completedSteps[completedSteps.length - 1]
      : null;

  const preview = useMemo(() => {
    if (!displayedStage) return null;
    if (currentStep) return null;
    const cleanMessage = shortMemoryPreview(lastMessage);
    if (cleanMessage) return cleanMessage;
    const lastSlot = memorySlots[0];
    if (lastSlot?.preview) return shortMemoryPreview(lastSlot.preview);
    return STAGE_PLACEHOLDER[displayedStage];
  }, [displayedStage, currentStep, lastMessage, memorySlots]);

  const dispatchIndex = CPU_STEPS.indexOf("DISPATCH");

  return (
    <section
      aria-label="Mission pipeline"
      className={cn(
        "workspace-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur",
        spawnTick && "workspace-panel-highlight"
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-left text-os-dim">
          Mission Pipeline
        </span>
        {currentStep && (
          <span className="inline-flex items-center gap-1.5 text-[color:var(--workspace-accent)]">
            <span className="workspace-dot-active size-1.5 rounded-full bg-[color:var(--workspace-accent)]" />
            <span className="text-left text-[color:var(--workspace-accent)]">
              Running
            </span>
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        <MissionPipeline
          stages={MISSION_PIPELINE_STAGES}
          activeIndex={
            spawnTick && activeIndex < 0 ? dispatchIndex : activeIndex
          }
          pulseSpawn={spawnTick}
        />

        <div
          className={cn(
            "workspace-stage-card mt-3 rounded-xl border bg-white/5 px-5 py-4 backdrop-blur",
            currentStep
              ? "border-[color:var(--workspace-accent)]/45 workspace-stage-card--live"
              : "border-white/10"
          )}
        >
          {displayedStage ? (
            <>
              <span className="text-left text-os-dim">
                {currentStep ? "Running" : "Last completed"}
              </span>
              <span className="mt-0.5 text-left text-os-green">
                {STAGE_TITLE[displayedStage]}
              </span>
              <span className="mt-1 text-left text-os-green/80">
                {STAGE_DESCRIPTION[displayedStage]}
              </span>
              <AnimatePresence mode="wait" initial={false}>
                {currentStep ? (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mt-3 flex items-center gap-2.5 text-[11px] text-os-amber"
                  >
                    <ThinkingDots />
                    <span className="text-left text-os-amber">
                      Working…
                    </span>
                  </motion.div>
                ) : preview ? (
                  <motion.p
                    key="preview"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-os-green/90"
                  >
                    {preview}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <span className="text-left text-os-dim">
                Idle
              </span>
              <span className="text-left text-os-green/85">
                Spawn an agent on the graph or use Try this above.
              </span>
              <span className="text-left text-os-dim/80">
                Pipeline advances as the kernel routes your task.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
