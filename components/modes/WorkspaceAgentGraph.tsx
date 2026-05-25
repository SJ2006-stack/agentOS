"use client";

import { memo, useCallback, useMemo } from "react";
import {
  AGENT_GRAPH,
  getAgentDescription,
  getAgentDisplayName,
  HYDRA_MEMORY_HUB_ID,
} from "@/lib/os/agent-graph-data";
import { AGENT_GRAPH_LAYOUT, type GraphTemplate } from "@/lib/os/agent-graph-layout";
import {
  resolveAgentSignature,
  signatureStroke,
  type AgentSignature,
} from "@/lib/os/agent-signature";
import { dispatchShellCommand } from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";

const NODE_W = 40;
const NODE_H = 18;
const NODE_ANCHOR_X = NODE_W / 2;
const NODE_ANCHOR_Y = NODE_H / 2;

const PULSE_GRADIENT: Record<AgentSignature, string> = {
  research: "workspace-pulse-research",
  security: "workspace-pulse-security",
  code: "workspace-pulse-code",
  default: "workspace-pulse-default",
};

const SIGNATURE_FILL: Record<AgentSignature, string> = {
  research: "color-mix(in srgb, var(--os-cyan) 14%, var(--os-panel))",
  security: "color-mix(in srgb, var(--os-fault) 14%, var(--os-panel))",
  code: "color-mix(in srgb, var(--os-green) 14%, var(--os-panel))",
  default: "var(--os-panel)",
};

const SIGNATURE_LABEL: Record<AgentSignature, string> = {
  research: "var(--os-cyan)",
  security: "var(--os-fault)",
  code: "var(--os-green)",
  default: "var(--os-dim)",
};

const LEGEND_ITEMS: { label: string; sig: AgentSignature }[] = [
  { label: "Research", sig: "research" },
  { label: "Security", sig: "security" },
  { label: "Code", sig: "code" },
];

type GraphEdge = {
  key: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lit: boolean;
  sig: AgentSignature;
  delay: number;
  isMemoryHub: boolean;
};

function edgeStagger(fromId: string, toId: string): number {
  const key = fromId < toId ? `${fromId}|${toId}` : `${toId}|${fromId}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 12) * 0.12;
}

function buildEdges(
  templates: GraphTemplate[],
  activeNodeIds: ReadonlySet<string>
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const t of templates) {
    if (t.custom) continue;
    const from = AGENT_GRAPH_LAYOUT[t.id];
    const node = AGENT_GRAPH[t.id];
    if (!from || !node) continue;
    const sig = resolveAgentSignature(t.id, t.role);
    for (const toId of node.edges) {
      if (t.id === toId) continue;
      const to = AGENT_GRAPH_LAYOUT[toId];
      if (!to) continue;
      const isMemoryHub = toId === HYDRA_MEMORY_HUB_ID;
      const lit =
        !isMemoryHub &&
        (activeNodeIds.has(t.id) || activeNodeIds.has(toId));
      edges.push({
        key: `${t.id}-${toId}`,
        fromId: t.id,
        toId,
        x1: from.x + NODE_ANCHOR_X,
        y1: from.y + NODE_ANCHOR_Y,
        x2: to.x + NODE_ANCHOR_X,
        y2: to.y + NODE_ANCHOR_Y,
        lit,
        sig,
        delay: edgeStagger(t.id, toId),
        isMemoryHub,
      });
    }
  }
  return edges;
}

function formatActiveRoute(fromId: string, toId: string, templates: GraphTemplate[]): string {
  const fromTemplate = templates.find((t) => t.id === fromId);
  const toTemplate = templates.find((t) => t.id === toId);
  const fromLabel = getAgentDisplayName(fromId, fromTemplate?.role);
  const toLabel = getAgentDisplayName(toId, toTemplate?.role);
  return `${fromLabel} → ${toLabel}`;
}

function WorkspaceAgentGraphInner({ templates }: { templates: GraphTemplate[] }) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);

  const spawnTemplate = useCallback((templateId: string) => {
    const command = `spawn agent ${templateId}`;
    useOsStore.getState().setKernelCommand(command);
    dispatchShellCommand(command);
  }, []);

  const builtinTemplates = useMemo(
    () => templates.filter((t) => !t.custom),
    [templates]
  );
  const customTemplates = useMemo(
    () => templates.filter((t) => t.custom),
    [templates]
  );
  const edges = useMemo(
    () => buildEdges(builtinTemplates, activeNodeIds),
    [builtinTemplates, activeNodeIds]
  );
  const activeRoutes = useMemo(
    () =>
      edges
        .filter((e) => e.lit && !e.isMemoryHub)
        .map((e) => formatActiveRoute(e.fromId, e.toId, templates)),
    [edges, templates]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="workspace-graph-host relative min-h-[220px] flex-1 overflow-auto rounded-lg border border-os-border/60 bg-os-bg/40 p-3">
        <svg
          viewBox="-2 -2 220 78"
          className="workspace-graph-svg h-full min-h-[220px] w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Agent orchestration graph"
        >
          <defs>
            <pattern
              id="workspace-grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="var(--os-border)"
                strokeWidth="0.25"
                opacity="0.35"
              />
            </pattern>
            {(
              Object.entries(PULSE_GRADIENT) as [AgentSignature, string][]
            ).map(([sig, gradId]) => (
              <linearGradient key={gradId} id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="42%" stopColor={signatureStroke(sig)} stopOpacity="0" />
                <stop offset="50%" stopColor={signatureStroke(sig)} stopOpacity="0.95" />
                <stop offset="58%" stopColor={signatureStroke(sig)} stopOpacity="0" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            ))}
          </defs>

          <rect x="-2" y="-2" width="220" height="78" fill="url(#workspace-grid)" className="workspace-graph-grid" />

          <g className="workspace-graph-edges-static" aria-hidden>
            {edges.map(({ key, x1, y1, x2, y2, lit, sig, isMemoryHub }) => (
              <line
                key={key}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={
                  isMemoryHub
                    ? "workspace-graph-edge-memory"
                    : "workspace-graph-edge-base"
                }
                stroke={lit ? signatureStroke(sig) : "var(--os-border)"}
                strokeWidth={lit ? 0.7 : isMemoryHub ? 0.25 : 0.4}
                strokeOpacity={lit ? 0.35 : isMemoryHub ? 0.2 : 0.45}
                strokeDasharray={isMemoryHub ? "1.5 2.5" : undefined}
              />
            ))}
          </g>

          <g className="workspace-graph-edges-pulse" aria-hidden>
            {edges
              .filter((e) => e.lit)
              .map(({ key, x1, y1, x2, y2, sig, delay }) => (
                <line
                  key={`pulse-${key}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`workspace-graph-edge-pulse workspace-graph-edge-pulse--${sig}`}
                  stroke={`url(#${PULSE_GRADIENT[sig]})`}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
          </g>

          <g className="workspace-graph-nodes">
            {builtinTemplates.map((t) => {
              const pos = AGENT_GRAPH_LAYOUT[t.id] ?? { x: 10, y: 10 };
              const active = activeNodeIds.has(t.id);
              const sig = resolveAgentSignature(t.id, t.role);
              const stroke = signatureStroke(sig);
              const label = getAgentDisplayName(t.id, t.role);
              const description = getAgentDescription(t.id, t.role);
              return (
                <g
                  key={t.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="workspace-graph-node cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Spawn ${label}`}
                  onClick={() => spawnTemplate(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      spawnTemplate(t.id);
                    }
                  }}
                >
                  {active && (
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={1.5}
                      className="workspace-graph-node-halo"
                      fill="none"
                      stroke={stroke}
                      strokeWidth={2}
                      strokeOpacity={0.35}
                    />
                  )}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={1.5}
                    fill={SIGNATURE_FILL[sig]}
                    stroke={active ? stroke : "var(--os-border)"}
                    strokeWidth={active ? 1.2 : 0.65}
                  />
                  <rect
                    x={0.5}
                    y={1.5}
                    width={2}
                    height={NODE_H - 3}
                    rx={0.35}
                    fill={stroke}
                    fillOpacity={active ? 0.9 : 0.45}
                  />
                  <text
                    x={NODE_ANCHOR_X + 1}
                    y={11.5}
                    textAnchor="middle"
                    fill={active ? SIGNATURE_LABEL[sig] : "var(--os-green)"}
                    fillOpacity={active ? 1 : 0.78}
                    fontSize={6}
                    fontFamily="var(--font-mono)"
                    fontWeight={600}
                    letterSpacing="0.02em"
                  >
                    {label.length > 11 ? `${label.slice(0, 10)}…` : label}
                  </text>
                  <title>{`${label}\n${description}`}</title>
                </g>
              );
            })}
            {customTemplates.map((t, i) => {
              const active = activeNodeIds.has(t.id);
              const sig = resolveAgentSignature(t.id, t.role);
              const stroke = signatureStroke(sig);
              const label = getAgentDisplayName(t.id, t.role);
              const description = getAgentDescription(t.id, t.role);
              return (
                <g
                  key={t.id}
                  transform={`translate(${8 + (i % 4) * 44}, ${58})`}
                  className="workspace-graph-node cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Spawn ${label}`}
                  onClick={() => spawnTemplate(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      spawnTemplate(t.id);
                    }
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={1.5}
                    fill="transparent"
                    stroke={stroke}
                    strokeWidth={active ? 1.2 : 0.85}
                    strokeDasharray="2.5 1.2"
                    strokeOpacity={active ? 1 : 0.45}
                  />
                  <rect
                    x={0.5}
                    y={1.5}
                    width={2}
                    height={NODE_H - 3}
                    rx={0.35}
                    fill="var(--os-amber)"
                    fillOpacity={active ? 0.85 : 0.4}
                  />
                  <text
                    x={NODE_ANCHOR_X + 1}
                    y={11.5}
                    textAnchor="middle"
                    fill={active ? "var(--os-amber)" : "var(--os-green)"}
                    fillOpacity={active ? 1 : 0.78}
                    fontSize={6}
                    fontFamily="var(--font-mono)"
                    fontWeight={600}
                    letterSpacing="0.02em"
                  >
                    {label.length > 11 ? `${label.slice(0, 10)}…` : label}
                  </text>
                  <title>{`${label}\n${description}`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {activeRoutes.length > 0 && (
        <div
          className="workspace-graph-active-route shrink-0 rounded border border-os-cyan/30 bg-os-cyan/5 px-2.5 py-1.5 text-[11px] text-os-cyan"
          aria-live="polite"
        >
          <span className="inline text-left">
            Active route
          </span>
          <span className="mx-1.5 text-os-dim">·</span>
          <span className="font-mono">{activeRoutes.join(" · ")}</span>
        </div>
      )}

      <div className="workspace-graph-legend flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-os-dim">
        {LEGEND_ITEMS.map(({ label, sig }) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span
              className="workspace-graph-legend-swatch size-2 rounded-full"
              style={{ backgroundColor: signatureStroke(sig) }}
            />
            <span className="text-left">
              {label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export const WorkspaceAgentGraph = memo(WorkspaceAgentGraphInner);
