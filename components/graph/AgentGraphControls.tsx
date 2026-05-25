"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { getAgentDisplayName } from "@/lib/os/agent-graph-data";
import { dispatchCreateAgentOpen } from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

export function AgentGraphControls({
  templates,
  hideCreateAgent = false,
  section = "all",
}: {
  templates: GraphTemplate[];
  hideCreateAgent?: boolean;
  section?: "create" | "list" | "all";
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [listExpanded, setListExpanded] = useState(false);

  return (
    <>
      {!hideCreateAgent && (section === "create" || section === "all") && (
        <div className="workspace-graph-create shrink-0 rounded-lg border border-os-amber/35 bg-os-amber/5 p-2.5">
          <Button
            type="button"
            onClick={() => dispatchCreateAgentOpen()}
            className="workspace-graph-create-cta flex w-full items-center justify-center gap-2 rounded-md border border-os-amber/60 bg-os-amber/15 px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-os-amber transition-colors hover:border-os-amber hover:bg-os-amber/25"
          >
            <span className="text-center text-os-amber">+ Create agent</span>
          </Button>
        </div>
      )}

      {templates.length > 0 && (section === "list" || section === "all") && (
        <div className="shrink-0 border-t border-os-border/50 pt-1.5">
          <Button
            type="button"
            onClick={() => setListExpanded((open) => !open)}
            className="flex w-full items-center justify-between gap-2 text-left text-[10px] text-os-dim transition-colors hover:text-os-green"
            aria-expanded={listExpanded}
          >
            <span className="text-left text-os-dim">
              {`${templates.length} agent${templates.length === 1 ? "" : "s"}${activeNodeIds.size > 0 ? ` · ${activeNodeIds.size} active` : ""}`}
            </span>
            <span aria-hidden className="text-os-dim/70">
              {listExpanded ? "▾" : "▸"}
            </span>
          </Button>
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
