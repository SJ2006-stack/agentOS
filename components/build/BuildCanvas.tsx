"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTypewriterChunks } from "@/hooks/build/useTypewriterChunks";
import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";

const DEFAULT_TAB_ORDER = [
  "app/layout.tsx",
  "app/globals.css",
  "components/Hero.tsx",
  "app/page.tsx",
];

function fileLabel(path: string): string {
  return path.split("/").pop() ?? path;
}

function CodePane({
  path,
  content,
  streaming,
}: {
  path: string;
  content: string;
  streaming: boolean;
}) {
  const displayed = useTypewriterChunks(content, streaming);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0a0f14]/90">
      <header className="shrink-0 border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-os-dim">
        {path}
      </header>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-os-green/90">
        <code>{displayed}</code>
        {streaming && (
          <span className="build-stream-caret ml-0.5 inline-block" aria-hidden />
        )}
      </pre>
    </div>
  );
}

export const BuildCanvas = memo(function BuildCanvas() {
  const files = useOsStore((s) => s.build.files);
  const streamingPath = useOsStore((s) => s.build.streamingPath);
  const verifyStatus = useOsStore((s) => s.build.verifyStatus);
  const deployUrl = useOsStore((s) => s.build.deployUrl);
  const activeCores = useOsStore((s) => s.build.activeCores);
  const buildActive = useOsStore((s) => s.build.buildActive);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB_ORDER[0]!);

  const isAssembling = streamingPath !== null || activeCores.length > 0;
  const isDeployPending =
    verifyStatus === "pass" && !deployUrl && buildActive && !isAssembling;
  const isComplete = verifyStatus === "pass" && !isAssembling && Boolean(deployUrl);

  useEffect(() => {
    if (streamingPath) setActiveTab(streamingPath);
  }, [streamingPath]);

  const previewSrc = useMemo(() => {
    const html = files["preview.html"];
    if (!html) return null;
    return URL.createObjectURL(new Blob([html], { type: "text/html" }));
  }, [files]);

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const tabPaths = useMemo(() => {
    const keys = Object.keys(files).filter((p) => p !== "preview.html");
    const ordered = DEFAULT_TAB_ORDER.filter((p) => p in files || p === activeTab);
    const extras = keys.filter((p) => !ordered.includes(p)).sort();
    const merged = [...ordered, ...extras];
    return merged.length ? merged : [...DEFAULT_TAB_ORDER];
  }, [files, activeTab]);

  return (
    <section
      aria-label="Build canvas"
      className="workspace-card flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--workspace-accent)]/35 bg-white/[0.06] shadow-[0_0_32px_color-mix(in_srgb,var(--workspace-accent)_10%,transparent)] backdrop-blur"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div>
          <span className="text-left text-os-green">Build Canvas</span>
          <p className="mt-0.5 text-[10px] text-os-dim">
            {isComplete
              ? "Build complete — deploy URL ready"
              : isDeployPending
                ? "Verified — publishing deploy URL…"
                : isAssembling
                  ? `GPU workers assembling shell · ${activeCores.length} cores active`
                  : verifyStatus === "fail"
                    ? "Build failed verification"
                    : "GPU workers assembling shell"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isComplete && (
            <span className="rounded-full border border-os-green/50 bg-os-green/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-os-green">
              Complete
            </span>
          )}
          {verifyStatus !== "idle" && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider",
              verifyStatus === "running" && "border-os-amber/50 text-os-amber",
              verifyStatus === "pass" && "border-os-green/50 text-os-green",
              verifyStatus === "fail" && "border-red-400/50 text-red-300"
            )}
          >
            {verifyStatus === "running" ? "Verifying…" : verifyStatus}
          </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 flex-wrap gap-1">
            {tabPaths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => setActiveTab(path)}
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[10px] transition-colors",
                  activeTab === path
                    ? "border-[color:var(--workspace-accent)]/50 bg-[color:var(--workspace-accent)]/10 text-[color:var(--workspace-accent)]"
                    : "border-white/10 text-os-dim hover:border-white/20 hover:text-os-green"
                )}
              >
                {fileLabel(path)}
              </button>
            ))}
          </div>
          <CodePane
            path={activeTab}
            content={files[activeTab] ?? ""}
            streaming={streamingPath === activeTab}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: previewSrc ? 1 : 0.35 }}
          className="flex min-h-[180px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 lg:max-w-[42%]"
        >
          <header className="shrink-0 border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-os-dim">
            Live preview
          </header>
          {previewSrc ? (
            <iframe
              title="Build preview"
              src={previewSrc}
              className="min-h-0 flex-1 w-full border-0 bg-[#0a0f14]"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-[11px] text-os-dim">
              Preview loads when preview.html is assembled…
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
});
