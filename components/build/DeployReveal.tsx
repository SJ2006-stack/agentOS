"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  DEPLOY_URL_UNCONFIGURED,
  ensureHttpsDeployUrl,
  isDeployUrlUnresolved,
  isUnstableDeployUrl,
  resolveDemoDeployUrlForDisplay,
} from "@/lib/config/deploy-url";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, Copy, ExternalLink, X } from "lucide-react";
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

const DEV_DEPLOY_OVERRIDE_KEY = "demo-deploy-url-override";

export const DeployReveal = memo(function DeployReveal() {
  const storedDeployUrl = useOsStore((s) => s.build.deployUrl);
  const [devOverride, setDevOverride] = useState<string | undefined>(() => {
    if (process.env.NODE_ENV === "production") return undefined;
    if (typeof window === "undefined") return undefined;
    const saved = window.localStorage.getItem(DEV_DEPLOY_OVERRIDE_KEY)?.trim();
    return saved || undefined;
  });

  const deployUrl = useMemo(
    () =>
      resolveDemoDeployUrlForDisplay(storedDeployUrl, {
        clientOrigin:
          typeof window !== "undefined" ? window.location.origin : undefined,
        devOverride,
      }),
    [storedDeployUrl, devOverride]
  );
  const openUrl = deployUrl ? ensureHttpsDeployUrl(deployUrl) : null;
  const storedIsUnstable =
    storedDeployUrl != null &&
    !isDeployUrlUnresolved(storedDeployUrl) &&
    isUnstableDeployUrl(storedDeployUrl);
  const unresolved = storedDeployUrl != null && (deployUrl == null || isDeployUrlUnresolved(deployUrl));
  const isDev = process.env.NODE_ENV !== "production";
  const showModal = storedDeployUrl != null;
  const dismiss = useOsStore((s) => s.dismissDeployReveal);
  const [copied, setCopied] = useState(false);

  const onDismiss = useCallback(() => {
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal, onDismiss]);

  const onCopy = useCallback(async () => {
    if (!openUrl) return;
    try {
      await navigator.clipboard.writeText(openUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [openUrl]);

  return (
    <AnimatePresence>
      {showModal ? (
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
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border bg-os-green/10",
                  unresolved
                    ? "border-os-amber/40"
                    : "border-os-green/40"
                )}
              >
                {unresolved ? (
                  <AlertTriangle className="size-5 text-os-amber" aria-hidden />
                ) : (
                  <Check className="size-5 text-os-green" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <h2 className="text-left text-os-green">
                  {unresolved ? "Deploy URL not set" : "Deploy complete"}
                </h2>
                <p className="mt-1 text-left text-[11px] text-os-dim">
                  {unresolved
                    ? "Build finished, but no production URL is configured for this deployment."
                    : storedIsUnstable
                      ? "Showing your configured production URL (not this preview deployment host)."
                      : "Demo web app is live at the URL below."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              {openUrl ? <QrPlaceholder url={openUrl} /> : null}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "break-all rounded-lg border px-3 py-2 font-mono text-[11px]",
                    unresolved
                      ? "border-os-amber/30 bg-os-amber/5 text-os-amber/90"
                      : "border-white/10 bg-black/30 text-os-green/90"
                  )}
                >
                  {unresolved ? DEPLOY_URL_UNCONFIGURED : openUrl}
                </p>
                {isDev ? (
                  <label className="mt-3 block text-left text-[10px] text-os-dim">
                    Dev override URL
                    <input
                      type="url"
                      value={devOverride ?? ""}
                      onChange={(e) => {
                        const next = e.target.value.trim();
                        setDevOverride(next || undefined);
                        if (next) {
                          window.localStorage.setItem(DEV_DEPLOY_OVERRIDE_KEY, next);
                        } else {
                          window.localStorage.removeItem(DEV_DEPLOY_OVERRIDE_KEY);
                        }
                      }}
                      placeholder="https://your-app.vercel.app"
                      className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[10px] text-os-green/90"
                    />
                  </label>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {openUrl ? (
                    <>
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
                        href={openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-os-dim transition-colors hover:border-os-green/35 hover:text-os-green"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        Open
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
