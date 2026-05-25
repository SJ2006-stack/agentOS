"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { AgentGraphControls } from "@/components/AgentGraphControls";
import { WorkspaceAgentGraph } from "@/components/modes/WorkspaceAgentGraph";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

export function AgentGraphPanel({
  hydraConfigured,
  showHeader = true,
}: {
  hydraConfigured: boolean;
  showHeader?: boolean;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [templates, setTemplates] = useState<GraphTemplate[]>([]);

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 text-[10px]">
      {(showHeader || activeNodeIds.size > 0 || templates.length > 0) && (
        <div
          className={cn(
            "flex items-center gap-2",
            showHeader ? "justify-between" : "justify-end"
          )}
        >
          {showHeader && (
            <span className="uppercase tracking-wider text-os-dim">agent graph</span>
          )}
          <span className="text-os-dim">{activeNodeIds.size} active</span>
        </div>
      )}

      <WorkspaceAgentGraph templates={templates} />

      <AgentGraphControls
        templates={templates}
        hydraConfigured={hydraConfigured}
        onTemplatesChange={loadTemplates}
      />
    </div>
  );
}
