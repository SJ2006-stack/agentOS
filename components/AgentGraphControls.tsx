"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/api-url";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { getAgentDisplayName } from "@/lib/os/agent-graph-data";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

export function AgentGraphControls({
  templates,
  hydraConfigured,
  hideCreateAgent = false,
  section = "all",
  onTemplatesChange,
}: {
  templates: GraphTemplate[];
  hydraConfigured: boolean;
  hideCreateAgent?: boolean;
  section?: "create" | "list" | "all";
  onTemplatesChange: () => Promise<void>;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [createExpanded, setCreateExpanded] = useState(false);

  const onCreate = async () => {
    if (!name.trim() || !role.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/agents/registry"), {
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
      setCreateExpanded(false);
      await onTemplatesChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {hydraConfigured && !hideCreateAgent && (section === "create" || section === "all") && (
        <div className="workspace-graph-create shrink-0 rounded-lg border border-os-amber/35 bg-os-amber/5 p-2.5">
          {!createExpanded ? (
            <button
              type="button"
              onClick={() => setCreateExpanded(true)}
              className="workspace-graph-create-cta flex w-full items-center justify-center gap-2 rounded-md border border-os-amber/60 bg-os-amber/15 px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-os-amber transition-colors hover:border-os-amber hover:bg-os-amber/25"
            >
              + Create agent
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-os-amber">
                  New agent
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCreateExpanded(false);
                    setError(null);
                  }}
                  className="text-[10px] text-os-dim transition-colors hover:text-os-green"
                >
                  Cancel
                </button>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent name (e.g. Researcher)"
                className="w-full rounded border border-os-border bg-os-bg px-2 py-1.5 text-[12px] text-os-green outline-none focus:border-os-amber/50"
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role (e.g. Summarize docs before dispatch)"
                className="w-full rounded border border-os-border bg-os-bg px-2 py-1.5 text-[12px] text-os-green outline-none focus:border-os-amber/50"
              />
              <button
                type="button"
                disabled={busy || !name.trim() || !role.trim()}
                onClick={() => void onCreate()}
                className="workspace-graph-create-submit w-full rounded-md border border-os-amber bg-os-amber/20 px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-os-amber transition-colors hover:bg-os-amber/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Creating…" : "Create agent"}
              </button>
              {error && <p className="text-[11px] text-os-fault/90">{error}</p>}
            </div>
          )}
        </div>
      )}

      {templates.length > 0 && (section === "list" || section === "all") && (
        <div className="shrink-0 border-t border-os-border/50 pt-1.5">
          <button
            type="button"
            onClick={() => setListExpanded((open) => !open)}
            className="flex w-full items-center justify-between gap-2 text-left text-[10px] text-os-dim transition-colors hover:text-os-green"
            aria-expanded={listExpanded}
          >
            <span>
              {templates.length} agent{templates.length === 1 ? "" : "s"}
              {activeNodeIds.size > 0 && (
                <span className="text-os-amber"> · {activeNodeIds.size} active</span>
              )}
            </span>
            <span aria-hidden className="text-os-dim/70">
              {listExpanded ? "▾" : "▸"}
            </span>
          </button>
          {listExpanded && (
            <div className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-os-dim">
              {templates.slice(0, 8).map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "break-words text-[10px]",
                    activeNodeIds.has(t.id) && "text-os-amber"
                  )}
                >
                  {getAgentDisplayName(t.id, t.role)}
                  {t.custom && <span className="text-os-dim/70"> · custom</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
