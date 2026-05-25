"use client";

import { memo, useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GRID_SIZE } from "@/lib/os/types";
import { useOsStore } from "@/store/osStore";

export const GpuHeatmap = memo(function GpuHeatmap({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  const { heatmap, activeWorkers, lastDispatch, dispatchSeq } = useOsStore(
    (s) => s.gpu
  );
  const reduced = useReducedMotion();
  // #region agent log (post-fix verification)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetch('http://127.0.0.1:7901/ingest/bc0fcfc2-fcb7-4e10-bd54-a83f8bf9234b',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'464b73'},body:JSON.stringify({sessionId:'464b73',runId:'post-fix',location:'GpuHeatmap.tsx:mounted',message:'mounted state set - reduced value on client',data:{reduced,typeof_reduced:typeof reduced},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
  }, []);
  // #endregion
  const statusLabel = `workers ${activeWorkers}${
    lastDispatch ? ` · ${lastDispatch.hotZones.length} zones` : " · idle"
  }`;

  return (
    <div className="flex h-full flex-col">
      {showHeader ? (
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xs text-os-amber tracking-wider">GPU HEATMAP 16×16</h2>
          <span className="text-[10px] text-os-dim">{statusLabel}</span>
        </div>
      ) : (
        <div className="mb-1 flex justify-end">
          <span className="text-[10px] text-os-dim">{statusLabel}</span>
        </div>
      )}
      <motion.div
        key={dispatchSeq}
        initial={!mounted || reduced ? false : { scale: 0.97, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="grid flex-1 gap-px aspect-square max-h-full w-full max-w-md mx-auto"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {heatmap.map((row, y) =>
          row.map((heat, x) => {
            const hot = heat > 0.2;
            return (
              <motion.div
                key={`${x}-${y}`}
                animate={{
                  opacity: reduced ? (hot ? 1 : 0.15) : 0.15 + heat * 0.85,
                  scale: reduced ? 1 : hot ? 1 : 0.92,
                }}
                transition={{ duration: reduced ? 0 : 0.35 }}
                className="rounded-sm"
                style={{
                  backgroundColor:
                    heat > 0.1
                      ? `rgba(251, 191, 36, ${heat})`
                      : "rgba(34, 197, 94, 0.08)",
                  willChange: hot ? "opacity, transform" : undefined,
                }}
                title={`${x},${y} heat=${heat.toFixed(2)}`}
              />
            );
          })
        )}
      </motion.div>
    </div>
  );
});
