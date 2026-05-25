"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Play, RotateCcw, Sparkles } from "lucide-react";
import { BuildCanvas } from "@/components/build/BuildCanvas";
import { DeployReveal } from "@/components/build/DeployReveal";
import { Button } from "@/components/ui/button";
import { useOsRealtime } from "@/hooks/realtime/useOsRealtime";
import { executeOsCommand } from "@/lib/os/execute-command";
import { WORKSPACE_DEMO_COMMANDS } from "@/lib/os/workspace-demo";
import { useOsStore } from "@/store/os/osStore";
import { cn } from "@/lib/utils";
import "@/components/modes/workspace-ux.css";

const BUILD_COMMAND = WORKSPACE_DEMO_COMMANDS.submitWebShell;
const AUTO_START_MS = 1000;

const TAGLINE =
  "Multi-agent orchestration assembles a web shell in real time — GPU workers stream code, verify, then deploy.";

export function FinalDemoPage({ hydraConfigured }: { hydraConfigured: boolean }) {
  useOsRealtime(hydraConfigured);

  const buildActive = useOsStore((s) => s.build.buildActive);
  const deployUrl = useOsStore((s) => s.build.deployUrl);
  const verifyStatus = useOsStore((s) => s.build.verifyStatus);
  const kernelConnected = useOsStore((s) => s.kernel.connected);
  const activeCores = useOsStore((s) => s.build.activeCores);

  const [phase, setPhase] = useState<"idle" | "starting" | "building" | "done">("idle");
  const [isRunning, setIsRunning] = useState(false);
  const runningRef = useRef(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    useOsStore.getState().resetBuild();
  }, []);

  const runDemo = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setPhase("starting");
    useOsStore.getState().resetBuild();
    useOsStore.getState().setKernelCommand(BUILD_COMMAND);
    setPhase("building");
    try {
      await executeOsCommand(BUILD_COMMAND);
    } finally {
      runningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    const id = window.setTimeout(() => {
      void runDemo();
    }, AUTO_START_MS);
    return () => window.clearTimeout(id);
  }, [runDemo]);

  useEffect(() => {
    if (deployUrl) setPhase("done");
    else if (buildActive) setPhase("building");
  }, [deployUrl, buildActive]);

  const onReplay = useCallback(() => {
    void runDemo();
  }, [runDemo]);

  const showCanvas = buildActive || phase === "building" || phase === "done";

  return (
    <div
      className="final-demo relative flex min-h-screen flex-col overflow-hidden bg-os-bg/80 font-mono text-os-green"
      style={{ "--workspace-accent": "#00FFB2" } as React.CSSProperties}
    >
      <DeployReveal />

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in srgb, var(--workspace-accent) 8%, transparent), transparent 55%)",
        }}
      />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="text-[11px] text-os-dim transition-colors hover:text-os-green"
          >
            DevFactory OS
          </Link>
          <span className="text-os-dim/50" aria-hidden>
            /
          </span>
          <span className="text-[11px] text-os-green">Finale demo</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider",
              kernelConnected
                ? "border-os-green/40 text-os-green/90"
                : "border-os-dim/30 text-os-dim"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                kernelConnected ? "bg-os-green workspace-dot-active" : "bg-os-dim/50"
              )}
              aria-hidden
            />
            {kernelConnected ? "Live" : "Connecting…"}
          </span>

          <Button
            type="button"
            onClick={onReplay}
            disabled={isRunning && !deployUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-os-green/35 bg-os-bg/40 px-3 py-1.5 text-[11px] text-os-green transition-colors hover:border-os-amber/45 hover:bg-os-amber/10 hover:text-os-amber disabled:opacity-50"
          >
            {phase === "idle" || phase === "starting" ? (
              <Play className="size-3 shrink-0" aria-hidden />
            ) : (
              <RotateCcw className="size-3 shrink-0" aria-hidden />
            )}
            {phase === "idle" || phase === "starting" ? "Build web shell" : "Replay demo"}
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          {!showCanvas ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-os-amber/30 bg-os-amber/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-os-amber">
                <Sparkles className="size-3" aria-hidden />
                Hackathon finale
              </span>
              <h1 className="max-w-2xl text-balance text-lg leading-snug text-os-green sm:text-xl">
                {TAGLINE}
              </h1>
              <p className="text-[11px] text-os-dim">
                Demo auto-starts in 1s — agents dispatch GPU workers to assemble the shell
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-os-dim">
                <span className="build-stream-caret inline-block" aria-hidden />
                Initializing build pipeline…
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex min-h-0 flex-1 flex-col gap-3"
            >
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h1 className="text-left text-os-green">Build web shell</h1>
                  <p className="mt-1 max-w-xl text-left text-[11px] leading-snug text-os-dim">
                    {TAGLINE}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-os-dim">
                  {activeCores.length > 0 && (
                    <span className="rounded-full border border-os-amber/40 bg-os-amber/10 px-2 py-0.5 text-os-amber">
                      {activeCores.length} GPU core{activeCores.length === 1 ? "" : "s"} active
                    </span>
                  )}
                  {verifyStatus !== "idle" && (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 uppercase tracking-wider",
                        verifyStatus === "running" && "border-os-amber/50 text-os-amber",
                        verifyStatus === "pass" && "border-os-green/50 text-os-green",
                        verifyStatus === "fail" && "border-red-400/50 text-red-300"
                      )}
                    >
                      {verifyStatus === "running" ? "Verifying…" : verifyStatus}
                    </span>
                  )}
                  {deployUrl && (
                    <a
                      href={deployUrl.startsWith("http") ? deployUrl : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border border-os-green/40 bg-os-green/10 px-2.5 py-0.5 text-os-green transition-colors hover:bg-os-green/15",
                        !deployUrl.startsWith("http") && "pointer-events-none opacity-60"
                      )}
                    >
                      Deployed
                      <ExternalLink className="size-2.5" aria-hidden />
                    </a>
                  )}
                </div>
              </div>

              <div className="min-h-[min(72vh,640px)] flex-1">
                <BuildCanvas />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
