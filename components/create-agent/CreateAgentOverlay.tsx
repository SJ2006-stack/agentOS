"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { CreateAgentFlow } from "@/components/create-agent/CreateAgentFlow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CreateAgentOverlay({
  open,
  onClose,
  hydraConfigured,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  hydraConfigured: boolean;
  onComplete?: () => void;
}) {
  const handleComplete = useCallback(() => {
    onComplete?.();
    onClose();
  }, [onClose, onComplete]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="create-agent-overlay fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-agent-overlay-title"
    >
      <button
        type="button"
        aria-label="Close create agent"
        className="absolute inset-0 bg-os-bg/85 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col",
          "rounded-2xl border border-os-amber/35 bg-os-panel/95 shadow-2xl shadow-os-bg/60",
          "ring-1 ring-inset ring-white/[0.06]"
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-os-border/60 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="create-agent-overlay-title"
              className="font-mono text-sm font-semibold uppercase leading-tight tracking-wider text-os-amber"
            >
              Create agent
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-os-dim">
              Pick a graph template or customize your own role.
            </p>
          </div>
          <Button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-os-border/70 p-2.5 text-os-dim hover:text-os-green"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <CreateAgentFlow
            variant="overlay"
            hydraConfigured={hydraConfigured}
            onClose={onClose}
            onComplete={handleComplete}
          />
        </div>

        <footer className="shrink-0 border-t border-os-border/50 px-5 py-3.5 text-[10px] leading-relaxed text-os-dim/80 sm:px-6">
          Or type{" "}
          <code className="break-all text-os-green/90">
            create agent &lt;name&gt; &quot;&lt;role&gt;&quot;
          </code>{" "}
          in the command bar.
        </footer>
      </div>
    </div>
  );
}
