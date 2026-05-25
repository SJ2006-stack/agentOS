"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { CPU_STEPS, type CpuStep } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

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

type StageState = "future" | "active" | "done";

function stageStateFor(
  step: CpuStep,
  current: CpuStep | null,
  completed: ReadonlyArray<CpuStep>
): StageState {
  if (current === step) return "active";
  if (completed.includes(step)) return "done";
  return "future";
}

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

  return (
    <section
      aria-label="Mission pipeline"
      className="workspace-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-os-dim">
          Mission Pipeline
        </h2>
        {currentStep && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--workspace-accent)]">
            <span className="workspace-dot-active size-1.5 rounded-full bg-[color:var(--workspace-accent)]" />
            Running
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <ol
          className="workspace-pipeline-track grid w-full"
          style={{
            gridTemplateColumns: `repeat(${CPU_STEPS.length}, minmax(0, 1fr))`,
          }}
          aria-label="Pipeline stages"
        >
          {CPU_STEPS.map((step, idx) => {
            const state = stageStateFor(step, currentStep, completedSteps);
            const showConnector = idx < CPU_STEPS.length - 1;
            const connectorFilled =
              activeIndex > idx ||
              (activeIndex === idx && state === "done") ||
              completedSteps.includes(step);
            const connectorPulsing =
              currentStep != null && idx === activeIndex && showConnector;

            return (
              <li
                key={step}
                className={cn(
                  "workspace-stage relative flex flex-col items-center text-center",
                  state === "active" && "workspace-stage--active",
                  state === "done" && "workspace-stage--done",
                  state === "future" && "workspace-stage--future"
                )}
                aria-current={state === "active" ? "step" : undefined}
              >
                {showConnector && (
                  <span
                    className={cn(
                      "workspace-connector",
                      connectorFilled && "workspace-connector--filled",
                      connectorPulsing && "workspace-connector--pulse"
                    )}
                    aria-hidden
                  />
                )}
                <span className="workspace-stage-node">
                  {state === "active" && (
                    <span
                      className="workspace-stage-ring"
                      aria-hidden
                    />
                  )}
                  {state === "done" ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <span className="font-mono text-[10px] font-semibold">
                      {idx + 1}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.16em]">
                  {step}
                </span>
              </li>
            );
          })}
        </ol>

        <div
          className={cn(
            "workspace-stage-card mt-2 rounded-xl border bg-white/5 px-4 py-3 backdrop-blur",
            currentStep
              ? "border-[color:var(--workspace-accent)]/45 workspace-stage-card--live"
              : "border-white/10"
          )}
        >
          {displayedStage ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-os-dim">
                {currentStep ? "Running" : "Last completed"}
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-os-green">
                {STAGE_TITLE[displayedStage]}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-os-green/80">
                {STAGE_DESCRIPTION[displayedStage]}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                {currentStep ? (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 flex items-center gap-2 text-[11px] text-os-amber"
                  >
                    <ThinkingDots />
                    <span>Working…</span>
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
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-os-dim">
                Idle
              </p>
              <p className="text-[13px] text-os-green/85">
                Send a command to start a mission.
              </p>
              <p className="text-[11px] text-os-dim">
                Try{" "}
                <span className="font-mono text-os-green/85">submit …</span> or
                spawn an agent on the left.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
