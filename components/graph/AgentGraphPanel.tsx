"use client";

import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "@/lib/api/url";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import { BUILTIN_GRAPH_TEMPLATES } from "@/lib/os/builtin-graph-templates";
import { AgentGraphControls } from "@/components/graph/AgentGraphControls";
import { WorkspaceAgentGraph } from "@/components/modes/WorkspaceAgentGraph";
import { ComicText } from "@/components/ui/comic-text";
import { cn } from "@/lib/utils";
import { SHELL_COMMAND_EVENT, type ShellCommandDetail } from "@/lib/os/shell-events";
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
    window.addEventListener(SHELL_COMMAND_EVENT, onShellCommand);
    return () => window.removeEventListener(SHELL_COMMAND_EVENT, onShellCommand);
  }, [loadCustomTemplates]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 text-[11px]">
      {(showHeader || activeNodeIds.size > 0) && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            showHeader ? "justify-between" : "justify-end"
          )}
        >
          {showHeader && (
            <ComicText fontSize={1.3} className="text-left text-os-dim">
              agent graph
            </ComicText>
          )}
          {activeNodeIds.size > 0 && (
            <ComicText fontSize={1} className="rounded border border-os-green/30 bg-os-green/5 px-1.5 py-0.5 text-left text-os-green">
              {`${activeNodeIds.size} active`}
            </ComicText>
          )}
        </div>
      )}

      {!hideCreateAgent && hydraConfigured && (
        <AgentGraphControls
          templates={templates}
          hydraConfigured={hydraConfigured}
          section="create"
          onTemplatesChange={loadCustomTemplates}
        />
      )}

      <div className="min-h-0 flex-1">
        <WorkspaceAgentGraph templates={templates} />
      </div>

      <div className="shrink-0">
        <AgentGraphControls
          templates={templates}
          hydraConfigured={hydraConfigured}
          hideCreateAgent
          section="list"
          onTemplatesChange={loadCustomTemplates}
        />
      </div>
    </div>
  );
}
