"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { BUILTIN_GRAPH_EDGES } from "@/lib/os/builtin-graph-templates";
import { cn } from "@/lib/utils";

const LAYOUT: Record<string, { x: number; y: number }> = {
  "user.session": { x: 8, y: 4 },
  "kernel.orchestrator": { x: 28, y: 18 },
  "cpu.intake": { x: 52, y: 8 },
  "cpu.plan": { x: 68, y: 8 },
  "cpu.route": { x: 84, y: 8 },
  "cpu.dispatch": { x: 100, y: 8 },
  "cpu.verify": { x: 116, y: 8 },
  "cpu.commit": { x: 132, y: 8 },
  "gpu.worker": { x: 100, y: 36 },
  "io.bus": { x: 52, y: 36 },
  "hydradb.memory": { x: 28, y: 48 },
};

const BUILTIN_IDS = Object.keys(LAYOUT);

function HeroGraphMiniInner({ className }: { className?: string }) {
  const [pulseIds, setPulseIds] = useState<string[]>([]);

  useEffect(() => {
    const tick = () => {
      const shuffled = [...BUILTIN_IDS].sort(() => Math.random() - 0.5);
      setPulseIds(shuffled.slice(0, 3));
    };
    tick();
    const id = window.setInterval(tick, 2400);
    return () => window.clearInterval(id);
  }, []);

  const edges = useMemo(() => {
    const litSet = new Set(pulseIds);
    const isLit = (id: string) => litSet.has(id);
    return BUILTIN_IDS.flatMap((fromId) => {
      const from = LAYOUT[fromId];
      const node = BUILTIN_GRAPH_EDGES[fromId];
      if (!from || !node) return [];
      return node
        .filter((toId) => LAYOUT[toId])
        .map((toId) => {
          const to = LAYOUT[toId]!;
          const edgeLit = isLit(fromId) || isLit(toId);
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={from.x + 11}
              y1={from.y + 5}
              x2={to.x + 11}
              y2={to.y + 5}
              stroke={edgeLit ? "url(#hero-edge-glow)" : "var(--hero-graphite)"}
              strokeWidth={edgeLit ? 0.6 : 0.3}
              strokeOpacity={edgeLit ? 0.7 : 0.25}
            />
          );
        });
    });
  }, [pulseIds]);

  return (
    <svg
      viewBox="0 0 160 56"
      className={cn("h-full w-full hero-graph-pulse", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-edge-glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--hero-cyan)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--hero-cyan)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--hero-purple)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {edges}
      {BUILTIN_IDS.map((id) => {
        const pos = LAYOUT[id] ?? { x: 10, y: 10 };
        const active = pulseIds.includes(id);
        return (
          <g key={id} transform={`translate(${pos.x}, ${pos.y})`}>
            <rect
              width={22}
              height={10}
              rx={1.5}
              fill="var(--hero-obsidian)"
              stroke={active ? "var(--hero-cyan)" : "var(--hero-graphite)"}
              strokeWidth={active ? 1 : 0.5}
              strokeOpacity={active ? 0.9 : 0.4}
              className={active ? "hero-node-active" : undefined}
            />
            <text
              x={11}
              y={6}
              textAnchor="middle"
              fill={active ? "var(--hero-cyan)" : "var(--hero-muted)"}
              fontSize={3}
              fontFamily="var(--font-mono)"
            >
              {id.split(".").pop()?.slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const HeroGraphMini = memo(HeroGraphMiniInner);
