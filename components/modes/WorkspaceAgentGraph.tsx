"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENT_GRAPH } from "@/lib/os/agent-graph-data";
import {
  resolveAgentSignature,
  signatureStroke,
} from "@/lib/os/agent-signature";
import { useOsStore } from "@/store/osStore";

interface GraphTemplate {
  id: string;
  role: string;
  custom: boolean;
}

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

export function WorkspaceAgentGraph({
  hydraConfigured,
}: {
  hydraConfigured: boolean;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [templates, setTemplates] = useState<GraphTemplate[]>([]);
  const [pulseGen, setPulseGen] = useState(0);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/registry");
      if (!res.ok) return;
      const data = (await res.json()) as {
        templates: { id: string; role: string; custom: boolean }[];
      };
      setTemplates(
        data.templates.map((t) => ({
          id: t.id,
          role: t.role,
          custom: t.custom,
        }))
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
    if (hydraConfigured) {
      void fetch("/api/agents/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load" }),
      }).then(() => loadTemplates());
    }
  }, [hydraConfigured, loadTemplates]);

  useEffect(() => {
    if (activeNodeIds.size > 0) setPulseGen((n) => n + 1);
  }, [activeNodeIds]);

  const builtinTemplates = templates.filter((t) => !t.custom);
  const customTemplates = templates.filter((t) => t.custom);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5 text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <span className="uppercase tracking-wider text-os-dim">agent graph</span>
        <span className="text-os-dim">{activeNodeIds.size} active</span>
      </div>
      <div className="workspace-graph-host relative min-h-0 flex-1 overflow-auto rounded border border-os-border/60 bg-os-bg/40 p-2">
        <svg
          viewBox="0 0 160 56"
          className="h-full min-h-[100px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="edge-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="45%" stopColor="var(--os-amber)" />
              <stop offset="55%" stopColor="var(--os-amber)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {builtinTemplates.flatMap((t) => {
            const from = LAYOUT[t.id];
            if (!from) return [];
            const node = AGENT_GRAPH[t.id];
            if (!node) return [];
            return node.edges
              .filter((toId) => LAYOUT[toId])
              .map((toId) => {
                const to = LAYOUT[toId]!;
                const lit =
                  activeNodeIds.has(t.id) || activeNodeIds.has(toId);
                const sig = resolveAgentSignature(t.id, t.role);
                return (
                  <g key={`${t.id}-${toId}-${pulseGen}`}>
                    <line
                      x1={from.x + 11}
                      y1={from.y + 5}
                      x2={to.x + 11}
                      y2={to.y + 5}
                      stroke={lit ? signatureStroke(sig) : "var(--os-border)"}
                      strokeWidth={lit ? 0.6 : 0.25}
                      strokeOpacity={lit ? 0.35 : 0.5}
                    />
                    {lit && (
                      <line
                        x1={from.x + 11}
                        y1={from.y + 5}
                        x2={to.x + 11}
                        y2={to.y + 5}
                        className="workspace-graph-edge-pulse"
                        stroke="url(#edge-pulse-grad)"
                        strokeWidth={1.2}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              });
          })}
          {builtinTemplates.map((t) => {
            const pos = LAYOUT[t.id] ?? { x: 10, y: 10 };
            const active = activeNodeIds.has(t.id);
            const sig = resolveAgentSignature(t.id, t.role);
            return (
              <g key={t.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  width={22}
                  height={10}
                  rx={1}
                  fill="var(--os-panel)"
                  stroke={active ? signatureStroke(sig) : "var(--os-border)"}
                  strokeWidth={active ? 1.2 : 0.6}
                />
                <text
                  x={11}
                  y={6}
                  textAnchor="middle"
                  className="fill-os-green text-[3px] font-mono"
                >
                  {t.id.split(".").pop()?.slice(0, 8)}
                </text>
              </g>
            );
          })}
          {customTemplates.map((t, i) => {
            const active = activeNodeIds.has(t.id);
            const sig = resolveAgentSignature(t.id, t.role);
            return (
              <g key={t.id} transform={`translate(${8 + (i % 6) * 24}, ${44})`}>
                <rect
                  width={22}
                  height={10}
                  rx={1}
                  fill="transparent"
                  stroke={active ? signatureStroke(sig) : signatureStroke(sig)}
                  strokeWidth={active ? 1.4 : 1}
                  strokeDasharray="2 1"
                  strokeOpacity={active ? 1 : 0.5}
                />
                <text
                  x={11}
                  y={6}
                  textAnchor="middle"
                  className="fill-os-amber/90 text-[3px] font-mono"
                >
                  {t.id.replace("custom.", "").slice(0, 8)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-1 text-[9px] text-os-dim">
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-sky-400" /> Research
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-red-400" /> Security
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-400" /> Code
        </span>
      </div>
    </div>
  );
}
