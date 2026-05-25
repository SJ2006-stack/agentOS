"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Terminal } from "@/components/ui/terminal";
import { BootSequence } from "@/components/BootSequence";
import { cn } from "@/lib/utils";

interface OsLayoutProps {
  kernel: ReactNode;
  cpu: ReactNode;
  memory: ReactNode;
  io: ReactNode;
  gpu: ReactNode;
  shell: ReactNode;
  hydraConfigured?: boolean;
}

export function OsLayout({
  kernel,
  cpu,
  memory,
  io,
  gpu,
  shell,
  hydraConfigured = false,
}: OsLayoutProps) {
  return (
    <div className="relative flex h-screen w-screen items-stretch justify-center overflow-hidden bg-os-bg p-2 font-mono text-os-green sm:p-3">
      <AnimatedThemeToggler
        variant="star"
        fromCenter
        className="fixed top-3 right-3 z-[60] flex size-8 items-center justify-center rounded border border-os-border bg-os-panel/90 text-os-green shadow-sm transition-colors hover:border-os-green/50 hover:bg-os-panel hover:text-os-amber [&_svg]:size-4"
      />
      <Terminal
        sequence={false}
        startOnView={false}
        title="DevFactory OS — monitor"
        className={cn(
          "z-0 flex h-full w-full max-h-none max-w-none flex-col rounded-xl border border-os-border bg-os-bg text-os-green shadow-2xl",
          "[&>div:first-child]:shrink-0 [&>div:first-child]:border-os-border [&>div:first-child]:bg-os-panel/50 [&>div:first-child]:py-2.5"
        )}
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
        codeClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BootSequence hydraConfigured={hydraConfigured} />
          <header className="shrink-0 border-b border-os-border px-3 py-1.5">
            {kernel}
          </header>
          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[1fr_auto_auto] gap-2 p-2">
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2"
            >
              {cpu}
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2"
            >
              {memory}
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="col-span-2 min-h-0 max-h-28 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2"
            >
              {io}
            </motion.section>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="col-span-2 min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2"
            >
              {gpu}
            </motion.section>
          </div>
          <footer className="shrink-0 border-t border-os-border bg-os-panel/30 p-1.5">
            <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-os-dim">
              shell — xterm
            </div>
            <div className="h-[28vh] min-h-[180px] overflow-hidden rounded border border-os-border bg-os-bg">
              {shell}
            </div>
          </footer>
        </div>
      </Terminal>
    </div>
  );
}
