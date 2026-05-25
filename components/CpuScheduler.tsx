"use client";

import { motion } from "motion/react";
import { CPU_STEPS, useOsStore } from "@/store/osStore";

export function CpuScheduler() {
  const { cpu } = useOsStore();
  const { pipeline, lastMessage } = cpu;

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-2 text-xs text-os-amber tracking-wider">CPU SCHEDULER</h2>
      <div className="flex flex-wrap gap-1">
        {CPU_STEPS.map((step) => {
          const isActive = pipeline.currentStep === step;
          const isDone = pipeline.completedSteps.includes(step);
          return (
            <motion.div
              key={step}
              layoutId={isActive ? "cpu-active" : undefined}
              animate={{
                scale: isActive ? 1.05 : 1,
                opacity: isDone ? 1 : isActive ? 1 : 0.35,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`rounded px-2 py-1 text-[10px] border ${
                isActive
                  ? "border-os-amber bg-os-amber/10 text-os-amber"
                  : isDone
                    ? "border-os-green/50 text-os-green"
                    : "border-os-border text-os-dim"
              }`}
            >
              {step}
              {isActive && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="ml-1"
                >
                  ▶
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
      {pipeline.taskId && (
        <p className="mt-2 text-[10px] text-os-dim truncate">task {pipeline.taskId}</p>
      )}
      {lastMessage && (
        <p className="mt-1 text-[10px] text-os-green/80 truncate">{lastMessage}</p>
      )}
    </div>
  );
}
