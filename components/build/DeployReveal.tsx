"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  resolveDemoDeployUrlForDisplay,
} from "@/lib/config/deploy-url";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

function QrPlaceholder({ url }: { url: string }) {
  const size = 96;
  const cells = 8;
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) >>> 0;

  return (
    <div
      className="grid gap-px rounded border border-white/15 bg-white/5 p-1"
      style={{
        gridTemplateColumns: `repeat(${cells}, minmax(0, 1fr))`,
        width: size,
        height: size,
      }}
      aria-hidden
    >
      {Array.from({ length: cells * cells }, (_, i) => {
        const on = ((hash >> (i % 24)) & 1) === 1 || i % 7 === 0;
        return (
          <div
            key={i}
            className={cn("aspect-square min-w-0", on ? "bg-os-green/80" : "bg-transparent")}
          />
        );
      })}
    </div>
  );
}

export const DeployReveal = memo(function DeployReveal() {
  const storedDeployUrl = useOsStore((s) => s.build.deployUrl);
  const deployUrl = useMemo(
    () =>
      resolveDemoDeployUrlForDisplay(storedDeployUrl, {
        clientOrigin:
          typeof window !== "undefined" ? window.location.origin : undefined,
      }),
    [storedDeployUrl]
  );
  const dismiss = useOsStore((s) => s.dismissDeployReveal);
  const [copied, setCopied] = useState(false);

  const onDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    if (!deployUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deployUrl, onDismiss]);

  const onCopy = useCallback(async () => {
    if (!deployUrl) return;
    try {
      await navigator.clipboard.writeText(deployUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [deployUrl]);

  return (
    <AnimatePresence>
      {deployUrl ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label="Deploy complete"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 4 }}
            className="relative w-full max-w-md rounded-xl border border-os-green/35 bg-os-panel/95 p-6 shadow-[0_0_48px_rgba(0,255,178,0.12)]"
          >
            <Button
              type="button"
              onClick={onDismiss}
              className="absolute right-3 top-3 rounded-md border border-os-border/60 p-1.5 text-os-dim hover:text-os-green"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Button>

            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-os-green/40 bg-os-green/10">
                <Check className="size-5 text-os-green" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <h2 className="text-left text-os-green">Deploy complete</h2>
                <p className="mt-1 text-left text-[11px] text-os-dim">
                  Demo shell is live at the URL below.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <QrPlaceholder url={deployUrl} />
              <div className="min-w-0 flex-1">
                <p className="break-all rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-os-green/90">
                  {deployUrl}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-os-green/35 bg-os-green/10 px-3 py-1.5 text-[11px] text-os-green hover:bg-os-green/15"
                  >
                    {copied ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <Copy className="size-3.5" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy URL"}
                  </Button>
                  <a
                    href={deployUrl.startsWith("http") ? deployUrl : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-os-dim transition-colors hover:border-os-green/35 hover:text-os-green",
                      !deployUrl.startsWith("http") && "pointer-events-none opacity-50"
                    )}
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    Open
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
