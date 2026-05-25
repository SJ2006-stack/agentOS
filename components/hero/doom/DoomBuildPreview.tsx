"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { DoomLevelTemplate } from "./DoomLevelTemplates";

interface DoomBuildPreviewProps {
  template: DoomLevelTemplate;
  onComplete: () => void;
}

export function DoomBuildPreview({ template, onComplete }: DoomBuildPreviewProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [mapReveal, setMapReveal] = useState(0);

  const currentStep = template.buildSteps[stepIndex] ?? "";
  const done = stepIndex >= template.buildSteps.length;

  useEffect(() => {
    if (done) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }

    setTyped("");
    let i = 0;
    const typeInterval = setInterval(() => {
      i += 1;
      setTyped(currentStep.slice(0, i));
      if (i >= currentStep.length) clearInterval(typeInterval);
    }, 22);

    const revealTimer = setInterval(() => {
      setMapReveal((r) => Math.min(template.map.length, r + 1));
    }, 120);

    const nextStep = setTimeout(() => {
      setStepIndex((s) => s + 1);
    }, Math.max(900, currentStep.length * 24 + 400));

    return () => {
      clearInterval(typeInterval);
      clearInterval(revealTimer);
      clearTimeout(nextStep);
    };
  }, [stepIndex, done, currentStep, onComplete, template.buildSteps.length, template.map.length]);

  return (
    <div className="doom-build-preview flex h-full min-h-[280px] flex-col gap-4 md:flex-row">
      <div className="flex flex-1 flex-col font-mono text-[11px] text-[#94A3B8]">
        <span className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[#00FFB2]">
          Agent constructing
        </span>
        <span className="text-sm text-[#cbd5e1]">{template.name}</span>
        <div className="mt-4 min-h-[4rem] rounded border border-[#1E2D3D] bg-[#0D1520]/80 p-3">
          {template.buildSteps.slice(0, stepIndex).map((line, i) => (
            <div key={i} className="text-[#00FFB2]/80">
              ✓ {line}
            </div>
          ))}
          {!done ? (
            <div className="text-[#94A3B8]">
              <span className="text-[#8B5CF6]">›</span> {typed}
              <span className="doom-build-caret" aria-hidden />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[#00FFB2]"
            >
              ✓ Level compiled — loading renderer…
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="doom-build-map grid flex-1 gap-px rounded border border-[#1E2D3D] bg-[#1E2D3D] p-1"
        style={{
          gridTemplateColumns: `repeat(${template.map[0]?.length ?? 12}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {template.map.slice(0, mapReveal).map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className="aspect-square min-w-0"
              style={{
                backgroundColor:
                  cell === 1 ? "#3d2a4a" : cell === 2 ? "#8b2942" : "#0d1520",
                boxShadow: cell === 1 ? "inset 0 0 4px rgba(139,92,246,0.35)" : undefined,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
