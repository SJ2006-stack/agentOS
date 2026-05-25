"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { withBasePath } from "@/lib/api-url";
import { BUILTIN_GRAPH_TEMPLATES } from "@/lib/os/builtin-graph-templates";
import type { GraphTemplate } from "@/lib/os/agent-graph-layout";
import {
  getAgentDisplayName,
  HYDRA_MEMORY_HUB_ID,
} from "@/lib/os/agent-graph-data";
import {
  resolveAgentSignature,
  type AgentSignature,
} from "@/lib/os/agent-signature";
import {
  dispatchShellCommand,
  SHELL_COMMAND_EVENT,
  type ShellCommandDetail,
} from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/osStore";

const SIGNATURE_TAG_LABEL: Record<AgentSignature, string> = {
  research: "RESEARCH",
  security: "SECURITY",
  code: "CODE",
  default: "AGENT",
};

const SIGNATURE_TAG_CLASS: Record<AgentSignature, string> = {
  research: "text-sky-300 border-sky-400/45 bg-sky-500/10",
  security: "text-red-300 border-red-400/45 bg-red-500/10",
  code: "text-emerald-300 border-emerald-400/45 bg-emerald-500/10",
  default: "text-os-green/85 border-os-border/70 bg-os-panel/40",
};

function agentTemplateKey(id: string): string {
  return id;
}

interface DisplayAgent {
  id: string;
  role: string;
  active: boolean;
  custom: boolean;
  signature: AgentSignature;
  label: string;
}

function buildDisplayAgents(
  templates: GraphTemplate[],
  activeNodeIds: ReadonlySet<string>
): DisplayAgent[] {
  const seen = new Set<string>();
  const out: DisplayAgent[] = [];

  for (const t of templates) {
    if (t.id === HYDRA_MEMORY_HUB_ID) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push({
      id: t.id,
      role: t.role,
      custom: t.custom,
      active: activeNodeIds.has(t.id),
      signature: resolveAgentSignature(t.id, t.role),
      label: getAgentDisplayName(t.id, t.role),
    });
  }

  for (const nodeId of activeNodeIds) {
    if (nodeId === HYDRA_MEMORY_HUB_ID) continue;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    out.push({
      id: nodeId,
      role: nodeId,
      custom: nodeId.startsWith("custom.") || nodeId.startsWith("gpu.worker."),
      active: true,
      signature: resolveAgentSignature(nodeId),
      label: getAgentDisplayName(nodeId),
    });
  }

  return out.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export const WorkspaceAgentList = memo(function WorkspaceAgentList({
  hydraConfigured,
}: {
  hydraConfigured: boolean;
}) {
  const activeNodeIds = useOsStore((s) => s.graph.activeNodeIds);
  const [templates, setTemplates] = useState<GraphTemplate[]>(
    BUILTIN_GRAPH_TEMPLATES
  );

  const refreshTemplates = useCallback(async () => {
    if (!hydraConfigured) {
      setTemplates(BUILTIN_GRAPH_TEMPLATES);
      return;
    }
    try {
      const listRes = await fetch(withBasePath("/api/agents/registry"));
      if (!listRes.ok) return;
      const data = (await listRes.json()) as {
        templates: { id: string; role: string; custom: boolean }[];
      };
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        setTemplates(
          data.templates.map((t) => ({
            id: t.id,
            role: t.role,
            custom: t.custom,
          }))
        );
      }
    } catch {
      /* ignore */
    }
  }, [hydraConfigured]);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  useEffect(() => {
    const onShellCommand = (ev: Event) => {
      const { command } = (ev as CustomEvent<ShellCommandDetail>).detail;
      const trimmed = command.trim().toLowerCase();
      if (
        trimmed.startsWith("create agent") ||
        trimmed.startsWith("spawn agent")
      ) {
        window.setTimeout(() => void refreshTemplates(), 800);
      }
    };
    window.addEventListener(SHELL_COMMAND_EVENT, onShellCommand);
    return () => window.removeEventListener(SHELL_COMMAND_EVENT, onShellCommand);
  }, [refreshTemplates]);

  const agents = useMemo(
    () => buildDisplayAgents(templates, activeNodeIds),
    [templates, activeNodeIds]
  );

  const activeCount = activeNodeIds.size;

  const spawnTemplate = useCallback((templateId: string) => {
    const command = `spawn agent ${templateId}`;
    useOsStore.getState().setKernelCommand(command);
    dispatchShellCommand(command);
  }, []);

  const onSpawn = useCallback(() => {
    spawnTemplate("cpu.plan");
  }, [spawnTemplate]);

  return (
    <section
      aria-label="Active agents"
      className="workspace-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-os-dim">
          Active Agents
        </h2>
        <span
          className={cn(
            "workspace-count-pill inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums",
            activeCount > 0
              ? "border-[color:var(--workspace-accent)]/45 bg-[color:var(--workspace-accent)]/10 text-[color:var(--workspace-accent)]"
              : "border-white/10 bg-white/5 text-os-dim"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              activeCount > 0
                ? "workspace-dot-active bg-[color:var(--workspace-accent)]"
                : "bg-os-dim"
            )}
            aria-hidden
          />
          <span>{activeCount}</span>
        </span>
      </header>

      <ul className="min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto px-2.5 py-2 pr-2">
        <AnimatePresence initial={false}>
          {agents.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[11px] text-os-dim"
            >
              No agents yet. Spawn one to begin.
            </motion.li>
          )}
          {agents.map((agent) => (
            <motion.li
              key={agentTemplateKey(agent.id)}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "workspace-agent-card group flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 transition-colors hover:border-[color:var(--workspace-accent)]/40 hover:bg-white/[0.07]",
                agent.active && "workspace-agent-card--active"
              )}
              role="button"
              tabIndex={0}
              title={`Spawn ${agent.label}`}
              onClick={() => spawnTemplate(agent.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  spawnTemplate(agent.id);
                }
              }}
            >
              <span
                className={cn(
                  "shrink-0 size-2 rounded-full",
                  agent.active
                    ? "workspace-dot-active bg-[color:var(--workspace-accent)]"
                    : "bg-os-dim/60"
                )}
                aria-hidden
                title={agent.active ? "Active" : "Idle"}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-mono text-[11px] text-os-green/95">
                  {agent.id}
                </span>
                <span className="truncate text-[10px] text-os-dim">
                  {agent.label}
                </span>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.14em]",
                  SIGNATURE_TAG_CLASS[agent.signature]
                )}
              >
                {SIGNATURE_TAG_LABEL[agent.signature]}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <footer className="shrink-0 border-t border-white/10 p-2.5">
        <button
          type="button"
          onClick={onSpawn}
          className="workspace-spawn-btn group flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--workspace-accent)]/50 bg-[color:var(--workspace-accent)]/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--workspace-accent)] transition-[background-color,border-color,box-shadow]"
        >
          <Plus className="size-3.5" aria-hidden />
          <span>Spawn Agent</span>
        </button>
      </footer>
    </section>
  );
});
