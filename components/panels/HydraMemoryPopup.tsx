"use client";

import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { AnimatedList } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import {
  ExpandableText,
  formatMemoryPreview,
} from "@/components/ui/expandable-text";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";
import type { MemorySlotWrite } from "@/lib/os/types";

function statusTone(status: string): string {
  if (status === "indexed") return "text-os-green";
  if (status === "pending") return "text-os-amber";
  return "text-os-fault";
}

function statusLabel(status: MemorySlotWrite["status"]): string {
  if (status === "pending") return "indexing";
  return status;
}

function MemorySlotCard({ slot }: { slot: MemorySlotWrite }) {
  const agentShort = slot.agentId.split(".").pop() ?? slot.agentId;
  return (
    <div className="w-full rounded-lg border border-os-border/60 bg-os-bg/50 px-4 py-3 text-left font-mono text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("uppercase tracking-wide", statusTone(slot.status))}>
          [{statusLabel(slot.status)}]
        </span>
        <span className="break-all text-os-amber" title={slot.agentId}>
          {agentShort}
        </span>
        {slot.memoryId && (
          <span className="ml-auto truncate text-[9px] text-os-dim" title={slot.memoryId}>
            {slot.memoryId.slice(0, 12)}
            {slot.memoryId.length > 12 ? "…" : ""}
          </span>
        )}
      </div>
      {slot.preview ? (
        <ExpandableText
          text={formatMemoryPreview(slot.preview)}
          maxLines={3}
          className="mt-2 text-os-green/80"
        />
      ) : (
        <p className="mt-2 text-os-dim">No preview</p>
      )}
    </div>
  );
}

export function HydraMemoryPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const memory = useOsStore((s) => s.memory);
  const hydraConfigured = useOsStore((s) => s.hydraConfigured);
  const slots = memory.slots;
  const lastRecall = memory.lastRecall;

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const isEmpty = slots.length === 0 && !lastRecall;

  return (
    <div
      className="hydra-memory-popup fixed inset-0 z-[170] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hydra-memory-popup-title"
    >
      <button
        type="button"
        aria-label="Close memory view"
        className="absolute inset-0 bg-os-bg/88 backdrop-blur-md"
        onClick={handleClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col",
          "rounded-2xl border border-os-amber/30 bg-os-panel/96 shadow-2xl shadow-os-bg/60",
          "ring-1 ring-inset ring-white/[0.05]"
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-os-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="hydra-memory-popup-title"
              className="font-mono text-sm font-semibold uppercase tracking-wider text-os-amber"
            >
              Hydra memory
            </h2>
            <p className="mt-1 text-[11px] text-os-dim">
              {hydraConfigured
                ? `${slots.length} slot${slots.length === 1 ? "" : "s"} in store`
                : "HydraDB not configured"}
            </p>
          </div>
          <Button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            className="shrink-0 rounded-md border border-os-border/60 p-2 text-os-dim hover:border-os-amber/40 hover:text-os-green"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isEmpty ? (
            <p className="text-center font-mono text-[12px] leading-relaxed text-os-dim">
              No memory slots yet — boot Hydra or run{" "}
              <span className="text-os-green">recall kernel</span> in the terminal.
            </p>
          ) : (
            <>
              {slots.length > 0 && (
                <AnimatedList
                  key={`slots-${slots.length}-${slots[0]?.memoryId ?? slots[0]?.agentId ?? "none"}`}
                  delay={300}
                  showAllOnMount
                  className="items-stretch gap-2.5"
                >
                  {slots.map((slot) => (
                    <MemorySlotCard
                      key={slot.memoryId ?? `${slot.agentId}-${slot.preview.slice(0, 24)}`}
                      slot={slot}
                    />
                  ))}
                </AnimatedList>
              )}

              {lastRecall && (
                <div className="mt-4 border-t border-os-border/50 pt-4 font-mono text-[11px]">
                  <p className="text-os-amber">
                    recall: {lastRecall.query}
                  </p>
                  {lastRecall.chunks.slice(0, 4).map((c, i) => (
                    <ExpandableText
                      key={i}
                      text={c.text}
                      maxLines={2}
                      className="mt-2 text-os-dim"
                    />
                  ))}
                  {lastRecall.queryPaths && lastRecall.queryPaths.length > 0 && (
                    <p className="mt-2 text-[10px] text-os-dim">
                      paths: {lastRecall.queryPaths.slice(0, 3).join(" → ")}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
