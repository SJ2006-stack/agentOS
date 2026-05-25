"use client";

import { useEffect, useState, type JSX } from "react";
import { motion, useReducedMotion } from "motion/react";

const ACCENT = "#00FFB2";

export type Stage = { name: string; icon?: string };

export interface MissionPipelineProps {
  stages: Stage[];
  activeIndex: number;
  autoPlay?: boolean;
}

export const DEFAULT_PIPELINE_STAGES: Stage[] = [
  { name: "INTAKE", icon: "📥" },
  { name: "PLAN", icon: "🧭" },
  { name: "ROUTE", icon: "🛣️" },
  { name: "DISPATCH", icon: "🚀" },
  { name: "VERIFY", icon: "🔍" },
  { name: "COMMIT", icon: "✅" },
];

export function MissionPipeline({
  stages,
  activeIndex,
  autoPlay = false,
}: MissionPipelineProps): JSX.Element {
  const reduceMotion = useReducedMotion();
  const [internalIndex, setInternalIndex] = useState<number>(activeIndex);

  useEffect(() => {
    setInternalIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (!autoPlay || stages.length === 0) return;
    const id = setInterval(() => {
      setInternalIndex((prev) => (prev + 1) % stages.length);
    }, 2500);
    return () => clearInterval(id);
  }, [autoPlay, stages.length]);

  const current = autoPlay ? internalIndex : activeIndex;
  const safeCurrent = Math.max(-1, Math.min(current, stages.length - 1));

  return (
    <div
      className="mp-root"
      role="list"
      aria-label="Mission pipeline"
      data-active={safeCurrent}
    >
      {stages.map((stage, i) => {
        const isActive = i === safeCurrent;
        const isDone = i < safeCurrent;
        const isFuture = i > safeCurrent;
        const showConnector = i > 0;
        const connectorFilled = i <= safeCurrent;
        const isActiveEdge = i === safeCurrent;

        const cardClass = [
          "mp-card",
          isActive && "mp-card--active",
          isDone && "mp-card--done",
          isFuture && "mp-card--future",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={`${stage.name}-${i}`}
            className="mp-item"
            role="listitem"
          >
            {showConnector && (
              <div className="mp-connector" aria-hidden>
                <motion.div
                  className={
                    "mp-connector-fill" +
                    (isActiveEdge ? " mp-connector-fill--active" : "")
                  }
                  initial={false}
                  animate={{ width: connectorFilled ? "100%" : "0%" }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.6,
                    ease: "easeOut",
                  }}
                />
              </div>
            )}
            <motion.div
              className={cardClass}
              initial={false}
              animate={{
                scale: isActive ? 1.05 : 1,
                opacity: isFuture ? 0.3 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
                mass: 0.6,
              }}
              aria-current={isActive ? "step" : undefined}
              aria-label={`${stage.name} ${
                isDone ? "completed" : isActive ? "in progress" : "pending"
              }`}
            >
              {isActive && !reduceMotion && (
                <span className="mp-pulse-ring" aria-hidden />
              )}
              {isActive && !reduceMotion && (
                <span className="mp-shimmer" aria-hidden />
              )}
              <span className="mp-icon" aria-hidden>
                {isDone ? "✓" : (stage.icon ?? "•")}
              </span>
              <span className="mp-name">{stage.name}</span>
            </motion.div>
          </div>
        );
      })}
      <style jsx>{`
        .mp-root {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 0;
          width: 100%;
          background: transparent;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Consolas,
            "Liberation Mono",
            monospace;
          color: #d6f7ee;
          padding: 4px 0;
          background-image:
            radial-gradient(
              rgba(0, 255, 178, 0.06) 1px,
              transparent 1px
            );
          background-size: 18px 18px;
          background-position: 0 0;
          border-radius: 10px;
        }
        .mp-item {
          display: flex;
          align-items: center;
          flex: 1 1 140px;
          min-width: 0;
        }
        .mp-connector {
          position: relative;
          height: 2px;
          flex: 1 1 24px;
          min-width: 18px;
          background: rgba(0, 255, 178, 0.12);
          border-radius: 2px;
          margin: 0 8px;
          overflow: hidden;
        }
        .mp-connector-fill {
          position: absolute;
          inset: 0 auto 0 0;
          height: 100%;
          background: linear-gradient(
            90deg,
            rgba(0, 255, 178, 0.45),
            ${ACCENT}
          );
          box-shadow: 0 0 6px rgba(0, 255, 178, 0.45);
        }
        .mp-connector-fill--active::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.55) 50%,
            transparent 100%
          );
          background-size: 60% 100%;
          background-repeat: no-repeat;
          animation: mp-edge-scan 1.6s linear infinite;
        }
        .mp-card {
          position: relative;
          flex: 1 1 0;
          min-width: 110px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(8, 16, 14, 0.55);
          border: 1px solid rgba(0, 255, 178, 0.1);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
          overflow: hidden;
          transform-origin: center;
          will-change: transform, opacity;
        }
        .mp-card--active {
          border-color: ${ACCENT};
          box-shadow:
            0 0 0 1px ${ACCENT},
            0 0 18px rgba(0, 255, 178, 0.35),
            inset 0 0 12px rgba(0, 255, 178, 0.08);
          background: rgba(0, 255, 178, 0.05);
          z-index: 1;
        }
        .mp-card--done {
          border-left: 3px solid ${ACCENT};
          background: rgba(0, 255, 178, 0.05);
          opacity: 1;
        }
        .mp-card--future {
          border-color: transparent;
          background: rgba(8, 16, 14, 0.35);
        }
        .mp-icon {
          font-size: 14px;
          line-height: 1;
          letter-spacing: 0.02em;
        }
        .mp-card--done .mp-icon {
          color: ${ACCENT};
          font-weight: 700;
        }
        .mp-name {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 600;
          color: #c8f7e7;
        }
        .mp-card--active .mp-name {
          color: #ffffff;
          text-shadow: 0 0 8px rgba(0, 255, 178, 0.35);
        }
        .mp-card--future .mp-name {
          color: #9adfc7;
        }

        .mp-pulse-ring {
          position: absolute;
          inset: -2px;
          border-radius: 10px;
          border: 1px solid ${ACCENT};
          pointer-events: none;
          animation: mp-pulse 1.8s ease-out infinite;
        }
        .mp-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 40%,
            rgba(0, 255, 178, 0.22) 50%,
            transparent 60%,
            transparent 100%
          );
          background-size: 220% 100%;
          background-repeat: no-repeat;
          pointer-events: none;
          mix-blend-mode: screen;
          animation: mp-shimmer 2.2s linear infinite;
        }

        @keyframes mp-pulse {
          0% {
            opacity: 0.9;
            transform: scale(1);
          }
          80% {
            opacity: 0;
            transform: scale(1.08);
          }
          100% {
            opacity: 0;
            transform: scale(1.12);
          }
        }
        @keyframes mp-shimmer {
          0% {
            background-position: 220% 0;
          }
          100% {
            background-position: -120% 0;
          }
        }
        @keyframes mp-edge-scan {
          0% {
            background-position: -60% 0;
          }
          100% {
            background-position: 160% 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mp-pulse-ring,
          .mp-shimmer,
          .mp-connector-fill--active::after {
            display: none;
            animation: none !important;
          }
        }

        @media (max-width: 640px) {
          .mp-item {
            flex: 1 1 100%;
          }
          .mp-connector {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default MissionPipeline;
