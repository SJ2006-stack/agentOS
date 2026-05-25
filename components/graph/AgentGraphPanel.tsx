"use client";

import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "@/lib/api/url";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { BUILTIN_GRAPH_TEMPLATES } from "@/lib/os/builtin-graph-templates";
import { AgentGraphControls } from "@/components/graph/AgentGraphControls";
import { WorkspaceAgentGraph } from "@/components/modes/WorkspaceAgentGraph";
import { cn } from "@/lib/utils";
import {
  CREATE_AGENT_COMPLETE_EVENT,
  SHELL_COMMAND_EVENT,
  type ShellCommandDetail,
} from "@/lib/os/shell-events";
import { useOsStore } from "@/store/os/osStore";

export function AgentGraphPanel({
  hydraConfigured,
  showHeader = true,
  hideCreateAgent = false,
}: {
  hydraConfigured: boolean;
  showHeader?: boolean;
  hideCreateAgent?: boolean;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [templates, setTemplates] = useState<GraphTemplate[]>(BUILTIN_GRAPH_TEMPLATES);

  const loadCustomTemplates = useCallback(async () => {
    if (!hydraConfigured) return;
    try {
      const res = await fetch(withBasePath("/api/agents/registry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load" }),
      });
      if (!res.ok) return;
      const listRes = await fetch(withBasePath("/api/agents/registry"));
      if (!listRes.ok) return;
      const data = (await listRes.json()) as {
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
  }, [hydraConfigured]);

  useEffect(() => {
    if (!hydraConfigured) {
      setTemplates(BUILTIN_GRAPH_TEMPLATES);
      return;
    }
    void loadCustomTemplates();
  }, [hydraConfigured, loadCustomTemplates]);

  useEffect(() => {
    const onShellCommand = (ev: Event) => {
      const { command } = (ev as CustomEvent<ShellCommandDetail>).detail;
      if (command.trim().toLowerCase().startsWith("create agent")) {
        window.setTimeout(() => void loadCustomTemplates(), 1200);
      }
    };
    const onCreateComplete = () => {
      window.setTimeout(() => void loadCustomTemplates(), 600);
    };
    window.addEventListener(SHELL_COMMAND_EVENT, onShellCommand);
    window.addEventListener(CREATE_AGENT_COMPLETE_EVENT, onCreateComplete);
    return () => {
      window.removeEventListener(SHELL_COMMAND_EVENT, onShellCommand);
      window.removeEventListener(CREATE_AGENT_COMPLETE_EVENT, onCreateComplete);
    };
  }, [loadCustomTemplates]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 text-[11px]">
      <div
        className={cn(
          "flex shrink-0 items-center gap-2",
          showHeader ? "justify-between" : "justify-end"
        )}
      >
        {showHeader ? (
          <span className="text-left text-os-dim">
            agent graph
          </span>
        ) : (
          <span className="text-left text-[10px] text-os-dim/75">
            watch the graph — edges pulse when agents run
          </span>
        )}
        {activeNodeIds.size > 0 && (
          <span className="rounded border border-os-green/30 bg-os-green/5 px-1.5 py-0.5 text-left text-os-green">
            {`${activeNodeIds.size} active`}
          </span>
        )}
      </div>

      {!hideCreateAgent && (
        <AgentGraphControls templates={templates} section="create" />
      )}

      <div className="min-h-0 flex-1">
        <WorkspaceAgentGraph templates={templates} />
      </div>

      <div className="shrink-0">
        <AgentGraphControls templates={templates} hideCreateAgent section="list" />
      </div>
    </div>
  );
}
