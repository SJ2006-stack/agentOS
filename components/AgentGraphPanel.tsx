"use client";

import { useCallback, useEffect, useState } from "react";
import { AGENT_GRAPH } from "@/lib/os/agent-graph-data";
import { cn } from "@/lib/utils";
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

export function AgentGraphPanel({ hydraConfigured }: { hydraConfigured: boolean }) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [templates, setTemplates] = useState<GraphTemplate[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onCreate = async () => {
    if (!name.trim() || !role.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: name.trim(), role: role.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "create failed");
        return;
      }
      setName("");
      setRole("");
      await loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  const customTemplates = templates.filter((t) => t.custom);
  const builtinTemplates = templates.filter((t) => !t.custom);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <span className="uppercase tracking-wider text-os-dim">agent graph</span>
        <span className="text-os-dim">{templates.length} nodes</span>
      </div>

      <div className="relative min-h-[120px] flex-1 overflow-auto rounded border border-os-border/60 bg-os-bg/40 p-2">
        <svg
          viewBox="0 0 160 56"
          className="h-full min-h-[100px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
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
                return (
                  <line
                    key={`${t.id}-${toId}`}
                    x1={from.x + 11}
                    y1={from.y + 5}
                    x2={to.x + 11}
                    y2={to.y + 5}
                    className={cn(
                      lit ? "stroke-os-amber/60" : "stroke-os-border/80"
                    )}
                    strokeWidth={lit ? 0.5 : 0.25}
                  />
                );
              });
          })}
          {builtinTemplates.map((t) => {
            const pos = LAYOUT[t.id] ?? { x: 10, y: 10 };
            const active = activeNodeIds.has(t.id);
            return (
              <g key={t.id} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  width={22}
                  height={10}
                  rx={1}
                  className={cn(
                    "fill-os-panel stroke-os-border",
                    active && "stroke-os-amber fill-os-panel/80"
                  )}
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
            return (
              <g key={t.id} transform={`translate(${8 + (i % 6) * 24}, ${44})`}>
                <rect
                  width={22}
                  height={10}
                  rx={1}
                  fill="transparent"
                  className={cn(
                    "stroke-os-green/70",
                    active && "stroke-os-amber"
                  )}
                  strokeWidth={active ? 1.4 : 1}
                  strokeDasharray="2 1"
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

      <div className="max-h-16 space-y-0.5 overflow-y-auto text-os-dim">
        {templates.slice(0, 8).map((t) => (
          <div
            key={t.id}
            className={cn(
              "truncate",
              activeNodeIds.has(t.id) && "text-os-amber"
            )}
          >
            {t.id} — {t.role}
          </div>
        ))}
      </div>

      {hydraConfigured && (
        <div className="shrink-0 space-y-1 border-t border-os-border/50 pt-2">
          <div className="text-os-dim">create agent</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name"
            className="w-full rounded border border-os-border bg-os-bg px-1.5 py-0.5 text-os-green outline-none focus:border-os-green/50"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="role description"
            className="w-full rounded border border-os-border bg-os-bg px-1.5 py-0.5 text-os-green outline-none focus:border-os-green/50"
          />
          <button
            type="button"
            disabled={busy || !name.trim() || !role.trim()}
            onClick={() => void onCreate()}
            className="w-full rounded border border-os-border px-2 py-0.5 text-os-amber transition-colors hover:border-os-amber/50 disabled:opacity-40"
          >
            {busy ? "creating…" : "create agent"}
          </button>
          {error && <p className="text-red-400/90">{error}</p>}
        </div>
      )}
    </div>
  );
}
