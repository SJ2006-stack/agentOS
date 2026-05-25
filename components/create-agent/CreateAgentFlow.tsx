"use client";

import { useCallback, useState } from "react";
import { withBasePath } from "@/lib/api/url";
import {
  listCreateAgentTemplateCards,
  type CreateAgentTemplateCard,
} from "@/lib/os/create-agent-templates";
import { dispatchShellCommand } from "@/lib/os/shell-events";
import { ComicText } from "@/components/ui/comic-text";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

type Step = "name" | "pick" | "prompt" | "custom" | "working";

const TEMPLATE_CARDS = listCreateAgentTemplateCards();

export function CreateAgentFlow({
  onClose,
  onComplete,
  hydraConfigured,
  className,
}: {
  onClose: () => void;
  onComplete?: () => void;
  hydraConfigured: boolean;
  className?: string;
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
      onComplete?.();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setStep("custom");
    } finally {
      setBusy(false);
    }
  }, [agentName, customRole, onComplete, handleClose]);

  if (!hydraConfigured) {
    return (
      <div className={cn("text-[11px] text-os-dim", className)}>
        <ComicText fontSize={1.2} className="text-left text-os-dim">
          HydraDB is not configured — set HYDRADB_API_KEY to create agents.
        </ComicText>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {step === "name" && (
        <>
          <label className="space-y-1">
            <ComicText fontSize={1.1} className="text-left text-os-dim">
              Agent name
            </ComicText>
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
            <RippleButton
              type="button"
              onClick={handleClose}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim hover:text-os-green"
            >
              <ComicText fontSize={1.1} className="text-center text-os-dim">
                Cancel
              </ComicText>
            </RippleButton>
            <RippleButton
              type="button"
              disabled={!agentName.trim()}
              onClick={goNextFromName}
              className="rounded-md border border-os-amber/40 bg-os-amber/10 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/20 disabled:opacity-40"
            >
              <ComicText fontSize={1.1} className="text-center text-os-amber">
                Continue
              </ComicText>
            </RippleButton>
          </div>
        </>
      )}

      {step === "pick" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <ComicText fontSize={1.2} className="text-left text-os-amber">
              {agentName.trim()}
            </ComicText>
            <RippleButton
              type="button"
              onClick={() => setStep("name")}
              className="text-[10px] text-os-dim hover:text-os-green"
            >
              <ComicText fontSize={1} className="text-left text-os-dim">
                ← Name
              </ComicText>
            </RippleButton>
          </div>
          <div className="flex gap-1 rounded-md border border-os-border/60 p-0.5">
            {(["templates", "custom"] as const).map((tab) => (
              <RippleButton
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
                <ComicText fontSize={1} className="text-center">
                  {tab === "templates" ? "Templates" : "Customize your own"}
                </ComicText>
              </RippleButton>
            ))}
          </div>
          {pickTab === "templates" ? (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
              {TEMPLATE_CARDS.map((card) => (
                <RippleButton
                  key={card.templateId}
                  type="button"
                  onClick={() => selectTemplate(card)}
                  className="w-full rounded-lg border border-os-border/60 bg-os-bg/30 px-2.5 py-2 text-left transition-colors hover:border-os-amber/40 hover:bg-os-amber/5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <ComicText fontSize={1.2} className="text-left text-os-green">
                      {card.displayName}
                    </ComicText>
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
                </RippleButton>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <ComicText fontSize={1.1} className="text-left text-os-dim">
                Freeform custom agent — registered in HydraDB and spawnable from
                the graph.
              </ComicText>
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Role (e.g. reviews PRs for security issues)"
                className="w-full rounded-md border border-os-border/70 bg-os-bg/40 px-2 py-1.5 text-sm text-os-green outline-none focus:border-os-amber/40"
              />
              <RippleButton
                type="button"
                disabled={!customRole.trim() || busy}
                onClick={() => {
                  setPickTab("custom");
                  setStep("custom");
                }}
                className="w-full rounded-md border border-os-amber/40 bg-os-amber/10 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/20 disabled:opacity-40"
              >
                <ComicText fontSize={1.1} className="text-center text-os-amber">
                  Continue to create
                </ComicText>
              </RippleButton>
            </div>
          )}
          <RippleButton
            type="button"
            onClick={handleClose}
            className="self-start text-[10px] text-os-dim hover:text-os-green"
          >
            <ComicText fontSize={1} className="text-left text-os-dim">
              Cancel
            </ComicText>
          </RippleButton>
        </>
      )}

      {step === "prompt" && selected && (
        <>
          <div className="flex items-center justify-between gap-2">
            <ComicText fontSize={1.3} className="text-left text-os-amber">
              {selected.displayName}
            </ComicText>
            <RippleButton
              type="button"
              onClick={() => setStep("pick")}
              className="text-[10px] text-os-dim hover:text-os-green"
            >
              <ComicText fontSize={1} className="text-left text-os-dim">
                ← Templates
              </ComicText>
            </RippleButton>
          </div>
          <ComicText fontSize={1.3} className="text-left text-os-green">
            {selected.promptQuestion}
          </ComicText>
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
            <RippleButton
              type="button"
              onClick={handleClose}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim"
            >
              <ComicText fontSize={1.1} className="text-center text-os-dim">
                Cancel
              </ComicText>
            </RippleButton>
            <RippleButton
              type="button"
              disabled={busy || !userQuery.trim()}
              onClick={() => void runTemplateActivate()}
              className="rounded-md border border-os-amber/40 bg-os-amber/15 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber hover:bg-os-amber/25 disabled:opacity-40"
            >
              <ComicText fontSize={1.1} className="text-center text-os-amber">
                {busy ? "Working…" : "Run & spawn"}
              </ComicText>
            </RippleButton>
          </div>
        </>
      )}

      {step === "custom" && (
        <>
          <ComicText fontSize={1.2} className="text-left text-os-green">
            {`Custom agent ${agentName}`}
          </ComicText>
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
            <RippleButton
              type="button"
              onClick={() => setStep("pick")}
              className="rounded-md border border-os-border/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-dim"
            >
              <ComicText fontSize={1.1} className="text-center text-os-dim">
                Back
              </ComicText>
            </RippleButton>
            <RippleButton
              type="button"
              disabled={busy || !customRole.trim()}
              onClick={() => void runCustomCreate()}
              className="rounded-md border border-os-amber/40 bg-os-amber/15 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-os-amber disabled:opacity-40"
            >
              <ComicText fontSize={1.1} className="text-center text-os-amber">
                {busy ? "Creating…" : "Create agent"}
              </ComicText>
            </RippleButton>
          </div>
        </>
      )}

      {step === "working" && (
        <div className="py-4">
          <ComicText fontSize={1.2} className="text-center text-os-amber">
            Running template action and spawning agent…
          </ComicText>
        </div>
      )}
    </div>
  );
}
