"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/api/url";
import {
  listCreateAgentTemplateCards,
  type CreateAgentTemplateCard,
} from "@/lib/os/create-agent-templates";
import {
  dispatchCreateAgentComplete,
  dispatchShellCommand,
} from "@/lib/os/shell-events";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

type Step = "name" | "pick" | "prompt" | "custom" | "working";

const TEMPLATE_CARDS = listCreateAgentTemplateCards();

export function CreateAgentFlow({
  onClose,
  onComplete,
  hydraConfigured,
  className,
  variant = "inline",
}: {
  onClose: () => void;
  onComplete?: () => void;
  hydraConfigured: boolean;
  className?: string;
  /** overlay = full-screen panel with taller template list */
  variant?: "inline" | "overlay";
}) {
  const [step, setStep] = useState<Step>("name");
  const [agentName, setAgentName] = useState("");
  const [pickTab, setPickTab] = useState<"templates" | "custom">("templates");
  const [selected, setSelected] = useState<CreateAgentTemplateCard | null>(
    null
  );
  const [userQuery, setUserQuery] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("name");
    setAgentName("");
    setPickTab("templates");
    setSelected(null);
    setUserQuery("");
    setCustomRole("");
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const goNextFromName = useCallback(() => {
    if (!agentName.trim()) return;
    setError(null);
    setStep("pick");
  }, [agentName]);

  const selectTemplate = useCallback((card: CreateAgentTemplateCard) => {
    setSelected(card);
    setUserQuery("");
    setError(null);
    setStep("prompt");
  }, []);

  const runTemplateActivate = useCallback(async () => {
    if (!selected || !userQuery.trim() || !agentName.trim()) return;
    setBusy(true);
    setError(null);
    setStep("working");
    try {
      const res = await fetch(
        withBasePath("/api/os/create-agent/activate"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selected.templateId,
            agentName: agentName.trim(),
            userQuery: userQuery.trim(),
          }),
        }
      );
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        spawn?: { output?: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Activation failed");
        setStep("prompt");
        return;
      }
      useOsStore
        .getState()
        .setKernelCommand(
          `spawn agent ${selected.templateId} /* ${agentName.trim()} */`
        );
      dispatchCreateAgentComplete();
      onComplete?.();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed");
      setStep("prompt");
    } finally {
      setBusy(false);
    }
  }, [selected, userQuery, agentName, onComplete, handleClose]);

  const runCustomCreate = useCallback(async () => {
    const name = agentName.trim();
    const role = customRole.trim();
    if (!name || !role) return;
    setBusy(true);
    setError(null);
    setStep("working");
    try {
      const res = await fetch(withBasePath("/api/agents/registry"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, role }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        agent?: { id: string };
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Create failed");
        setStep("custom");
        return;
      }
      const agentId = data.agent?.id;
      const cmd = `create agent ${name} "${role.replace(/"/g, "")}"`;
      useOsStore.getState().setKernelCommand(cmd);
      dispatchShellCommand(cmd);
      if (agentId) {
        window.setTimeout(() => {
          dispatchShellCommand(`spawn agent ${agentId}`);
        }, 600);
      }
      dispatchCreateAgentComplete();
      onComplete?.();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setStep("custom");
    } finally {
      setBusy(false);
    }
  }, [agentName, customRole, onComplete, handleClose]);

  const templateListClass =
    variant === "overlay"
      ? "min-h-[200px] max-h-[min(52vh,480px)] space-y-2 overflow-y-auto pr-1"
      : "max-h-52 space-y-1.5 overflow-y-auto pr-0.5";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!hydraConfigured && (
        <p className="rounded-md border border-os-fault/35 bg-os-fault/10 px-2.5 py-2 text-[11px] text-os-fault/90">
          HydraDB is not configured — set HYDRADB_API_KEY to register and spawn
          agents. You can still browse templates below.
        </p>
      )}
      {step === "name" && (
        <>
          <label className="space-y-1">
            <span className="text-left text-os-dim">
              Agent name
            </span>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. market-research"
              className="w-full rounded-md border border-os-border/70 bg-os-bg/40 px-2 py-1.5 text-sm text-os-green outline-none focus:border-os-amber/40"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goNextFromName();
                }
              }}
            />
          </label>
          <div className="flex justify-end gap-1.5">
            <Button coolMode
              type="button"
              onClick={handleClose}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim hover:text-os-green"
            >
              <span className="text-center text-os-dim">
                Cancel
              </span>
            </Button>
            <Button coolMode
              type="button"
              disabled={!agentName.trim()}
              onClick={goNextFromName}
              className="rounded-md border border-os-amber/40 bg-os-amber/10 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/20 disabled:opacity-40"
            >
              <span className="text-center text-os-amber">
                Continue
              </span>
            </Button>
          </div>
        </>
      )}

      {step === "pick" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-left text-os-amber">
              {agentName.trim()}
            </span>
            <Button coolMode
              type="button"
              onClick={() => setStep("name")}
              className="text-[10px] text-os-dim hover:text-os-green"
            >
              <span className="text-left text-os-dim">
                ← Name
              </span>
            </Button>
          </div>
          <div className="flex gap-1 rounded-md border border-os-border/60 p-0.5">
            {(["templates", "custom"] as const).map((tab) => (
              <Button coolMode
                key={tab}
                type="button"
                onClick={() => setPickTab(tab)}
                className={cn(
                  "flex-1 rounded px-2 py-1 text-[10px] uppercase tracking-wide transition-colors",
                  pickTab === tab
                    ? "bg-os-amber/15 text-os-amber"
                    : "text-os-dim hover:text-os-green"
                )}
              >
                <span className="text-center">
                  {tab === "templates" ? "Templates" : "Customize your own"}
                </span>
              </Button>
            ))}
          </div>
          {pickTab === "templates" ? (
            <div className={templateListClass}>
              {TEMPLATE_CARDS.length === 0 ? (
                <p className="rounded-md border border-dashed border-os-border/60 px-3 py-4 text-center text-[11px] text-os-dim">
                  No spawnable templates found in the agent graph.
                </p>
              ) : null}
              {TEMPLATE_CARDS.map((card) => (
                <Button coolMode
                  key={card.templateId}
                  type="button"
                  onClick={() => selectTemplate(card)}
                  className="w-full rounded-lg border border-os-border/60 bg-os-bg/30 px-2.5 py-2 text-left transition-colors hover:border-os-amber/40 hover:bg-os-amber/5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-left text-os-green">
                      {card.displayName}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-os-dim/80">
                      {card.templateId}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-os-dim">
                    {card.description}
                  </p>
                  <p className="mt-0.5 text-[9px] text-os-dim/70">
                    {card.edgesSummary}
                  </p>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-left text-os-dim">
                Freeform custom agent — registered in HydraDB and spawnable from
                the graph.
              </span>
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Role (e.g. reviews PRs for security issues)"
                className="w-full rounded-md border border-os-border/70 bg-os-bg/40 px-2 py-1.5 text-sm text-os-green outline-none focus:border-os-amber/40"
              />
              <Button coolMode
                type="button"
                disabled={!customRole.trim() || busy || !hydraConfigured}
                onClick={() => {
                  setPickTab("custom");
                  setStep("custom");
                }}
                className="w-full rounded-md border border-os-amber/40 bg-os-amber/10 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/20 disabled:opacity-40"
              >
                <span className="text-center text-os-amber">
                  Continue to create
                </span>
              </Button>
            </div>
          )}
          <Button coolMode
            type="button"
            onClick={handleClose}
            className="self-start text-[10px] text-os-dim hover:text-os-green"
          >
            <span className="text-left text-os-dim">
              Cancel
            </span>
          </Button>
        </>
      )}

      {step === "prompt" && selected && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-left text-os-amber">
              {selected.displayName}
            </span>
            <Button coolMode
              type="button"
              onClick={() => setStep("pick")}
              className="text-[10px] text-os-dim hover:text-os-green"
            >
              <span className="text-left text-os-dim">
                ← Templates
              </span>
            </Button>
          </div>
          <span className="text-left text-os-green">
            {selected.promptQuestion}
          </span>
          <textarea
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            rows={3}
            placeholder="Your answer…"
            className="w-full resize-none rounded-md border border-os-border/70 bg-os-bg/40 px-2 py-1.5 text-sm text-os-green outline-none focus:border-os-amber/40"
            autoFocus
          />
          {error && (
            <p className="text-[11px] text-os-fault/90">{error}</p>
          )}
          <div className="flex justify-end gap-1.5">
            <Button coolMode
              type="button"
              onClick={handleClose}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim"
            >
              <span className="text-center text-os-dim">
                Cancel
              </span>
            </Button>
            <Button coolMode
              type="button"
              disabled={busy || !userQuery.trim() || !hydraConfigured}
              onClick={() => void runTemplateActivate()}
              className="rounded-md border border-os-amber/40 bg-os-amber/15 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/25 disabled:opacity-40"
            >
              <span className="text-center text-os-amber">
                {busy ? "Working…" : "Run & spawn"}
              </span>
            </Button>
          </div>
        </>
      )}

      {step === "custom" && (
        <>
          <span className="text-left text-os-green">
            {`Custom agent ${agentName}`}
          </span>
          <input
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Role description"
            className="w-full rounded-md border border-os-border/70 bg-os-bg/40 px-2 py-1.5 text-sm text-os-green outline-none focus:border-os-amber/40"
          />
          {error && (
            <p className="text-[11px] text-os-fault/90">{error}</p>
          )}
          <div className="flex justify-end gap-1.5">
            <Button coolMode
              type="button"
              onClick={() => setStep("pick")}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim"
            >
              <span className="text-center text-os-dim">
                Back
              </span>
            </Button>
            <Button coolMode
              type="button"
              disabled={busy || !customRole.trim() || !hydraConfigured}
              onClick={() => void runCustomCreate()}
              className="rounded-md border border-os-amber/40 bg-os-amber/15 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber disabled:opacity-40"
            >
              <span className="text-center text-os-amber">
                {busy ? "Creating…" : "Create agent"}
              </span>
            </Button>
          </div>
        </>
      )}

      {step === "working" && (
        <div className="py-4">
          <span className="text-center text-os-amber">
            Running template action and spawning agent…
          </span>
        </div>
      )}
    </div>
  );
}
