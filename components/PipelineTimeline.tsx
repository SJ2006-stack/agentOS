"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExpandableText } from "@/components/ui/expandable-text";
import { cn } from "@/lib/utils";
import { CPU_STEPS, useOsStore } from "@/store/osStore";
import type { CpuStep } from "@/lib/os/types";

const STEP_META: Record<
  CpuStep,
  { label: string; description: string }
> = {
  INTAKE: { label: "Intake", description: "Understanding your request" },
  PLAN: { label: "Plan", description: "Planning approach" },
  ROUTE: { label: "Route", description: "Choosing agents & queues" },
  DISPATCH: { label: "Dispatch", description: "Sending work to workers" },
  VERIFY: { label: "Verify", description: "Checking results" },
  COMMIT: { label: "Commit", description: "Saving outcomes to memory" },
};

function extractTaskText(lastCommand: string | null): string | null {
  if (!lastCommand) return null;
  const trimmed = lastCommand.trim();
  if (trimmed.toLowerCase().startsWith("submit ")) {
    return trimmed.slice("submit ".length).trim() || null;
  }
  return trimmed || null;
}

function stepIndex(step: CpuStep): number {
  return CPU_STEPS.indexOf(step);
}

function stepStatus(
  step: CpuStep,
  currentStep: CpuStep | null,
  completedSteps: CpuStep[]
): "active" | "done" | "future" {
  if (currentStep === step) return "active";
  if (completedSteps.includes(step)) return "done";
  return "future";
}

export const PipelineTimeline = memo(function PipelineTimeline() {
  const pipeline = useOsStore((s) => s.cpu.pipeline);
  const lastMessage = useOsStore((s) => s.cpu.lastMessage);
  const lastCommand = useOsStore((s) => s.kernel.lastCommand);

  const [stepMessages, setStepMessages] = useState<Partial<Record<CpuStep, string>>>(
    {}
  );
  const [selectedStep, setSelectedStep] = useState<CpuStep | null>(null);
  const prevStepRef = useRef<CpuStep | null>(null);
  const prevTaskIdRef = useRef<string | null>(null);

  const taskText = useMemo(() => extractTaskText(lastCommand), [lastCommand]);
  const hasProgress =
    pipeline.currentStep !== null ||
    pipeline.completedSteps.length > 0 ||
    Boolean(taskText) ||
    Boolean(lastMessage);

  useEffect(() => {
    if (pipeline.taskId !== prevTaskIdRef.current) {
      prevTaskIdRef.current = pipeline.taskId;
      setStepMessages({});
      setSelectedStep(null);
      prevStepRef.current = null;
    }
  }, [pipeline.taskId]);

  useEffect(() => {
    const { currentStep, completedSteps } = pipeline;
    const msg = lastMessage?.trim();

    if (
      prevStepRef.current &&
      prevStepRef.current !== currentStep &&
      msg
    ) {
      setStepMessages((prev) => ({
        ...prev,
        [prevStepRef.current!]: msg,
      }));
    }

    if (!currentStep && completedSteps.length > 0 && msg) {
      const lastDone = completedSteps[completedSteps.length - 1]!;
      setStepMessages((prev) => ({
        ...prev,
        [lastDone]: prev[lastDone] ?? msg,
      }));
    }

    if (currentStep && msg) {
      setStepMessages((prev) => ({ ...prev, [currentStep]: msg }));
    }

    prevStepRef.current = currentStep;
  }, [pipeline, lastMessage]);

  useEffect(() => {
    if (pipeline.currentStep) {
      setSelectedStep(pipeline.currentStep);
    }
  }, [pipeline.currentStep]);

  const focusStep = selectedStep ?? pipeline.currentStep;
  const focusMeta = focusStep ? STEP_META[focusStep] : null;
  const focusMessage = focusStep ? stepMessages[focusStep] : null;
  const activeIndex = pipeline.currentStep
    ? stepIndex(pipeline.currentStep)
    : pipeline.completedSteps.length > 0
      ? stepIndex(pipeline.completedSteps[pipeline.completedSteps.length - 1]!)
      : -1;

  if (!hasProgress) {
    return (
      <div className="pipeline-timeline pipeline-timeline--idle">
        <p className="text-[11px] leading-relaxed text-os-dim/80">
          Tap <span className="text-os-amber">Try this</span> above or run{" "}
          <code className="text-os-green/90">submit …</code> — your task flows through
          the pipeline here, step by step.
        </p>
        <div className="pipeline-track mt-3" aria-hidden>
          {CPU_STEPS.map((step, i) => (
            <div key={step} className="pipeline-track-step pipeline-track-step--future">
              {i > 0 && <span className="pipeline-connector" />}
              <span className="pipeline-node">
                <span className="pipeline-node-index">{i + 1}</span>
              </span>
              <span className="pipeline-step-label">{STEP_META[step].label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-timeline">
      {taskText && (
        <div className="pipeline-task mb-3">
          <p className="pipeline-task-label">Your task</p>
          <p className="pipeline-task-text">{taskText}</p>
          {pipeline.taskId && (
            <p className="mt-1 break-all font-mono text-[10px] text-os-dim/70">
              {pipeline.taskId}
            </p>
          )}
        </div>
      )}

      <div
        className="pipeline-track"
        role="list"
        aria-label="CPU pipeline progress"
      >
        {CPU_STEPS.map((step, i) => {
          const status = stepStatus(
            step,
            pipeline.currentStep,
            pipeline.completedSteps
          );
          const isSelectable = status === "active" || status === "done";
          const isSelected = focusStep === step;
          const connectorActive =
            activeIndex >= 0 && i > 0 && i <= activeIndex + (pipeline.currentStep ? 0 : 1);

          return (
            <div
              key={step}
              role="listitem"
              className={cn(
                "pipeline-track-step",
                status === "active" && "pipeline-track-step--active",
                status === "done" && "pipeline-track-step--done",
                status === "future" && "pipeline-track-step--future",
                isSelected && "pipeline-track-step--selected"
              )}
            >
              {i > 0 && (
                <span
                  className={cn(
                    "pipeline-connector",
                    connectorActive && "pipeline-connector--filled",
                    pipeline.currentStep === step && "pipeline-connector--pulse"
                  )}
                  aria-hidden
                />
              )}
              <button
                type="button"
                disabled={!isSelectable}
                onClick={() => isSelectable && setSelectedStep(step)}
                className="pipeline-node-btn"
                aria-current={status === "active" ? "step" : undefined}
                aria-pressed={isSelected}
                title={STEP_META[step].description}
              >
                <span className="pipeline-node">
                  {status === "done" ? (
                    <span className="pipeline-check" aria-hidden>
                      ✓
                    </span>
                  ) : status === "active" ? (
                    <motion.span
                      className="pipeline-active-ring"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                      aria-hidden
                    />
                  ) : (
                    <span className="pipeline-node-index">{i + 1}</span>
                  )}
                </span>
                <span className="pipeline-step-code">{step}</span>
                <span className="pipeline-step-label">{STEP_META[step].label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {focusStep && (
          <motion.div
            key={focusStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "pipeline-detail mt-3",
              pipeline.currentStep === focusStep && "pipeline-detail--live"
            )}
          >
            <p className="pipeline-detail-kicker">
              {pipeline.currentStep === focusStep ? "In progress" : "Step outcome"}
            </p>
            <p className="pipeline-detail-title">
              {focusMeta?.description ?? focusStep}
            </p>
            <ExpandableText
              text={
                focusMessage ||
                (pipeline.currentStep === focusStep
                  ? `Running ${focusStep}…`
                  : "No message recorded for this step.")
              }
              maxLines={3}
              className="pipeline-detail-message mt-0.5 text-[11px] leading-snug text-os-green/85"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
