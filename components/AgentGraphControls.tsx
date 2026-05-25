"use client";

import { useState } from "react";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

export function AgentGraphControls({
  templates,
  hydraConfigured,
  onTemplatesChange,
}: {
  templates: GraphTemplate[];
  hydraConfigured: boolean;
  onTemplatesChange: () => Promise<void>;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await onTemplatesChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
          {error && <p className="text-os-fault/90">{error}</p>}
        </div>
      )}
    </>
  );
}
