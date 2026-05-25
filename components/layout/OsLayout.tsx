"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Terminal } from "@/components/ui/terminal";
import { BootSequence } from "@/components/BootSequence";
import { DevFactoryBento } from "@/components/DevFactoryBento";
import { cn } from "@/lib/utils";

interface OsLayoutProps {
  kernel: ReactNode;
  configure: ReactNode;
  agentGraph: ReactNode;
  cpu: ReactNode;
  memory: ReactNode;
  io: ReactNode;
  gpu: ReactNode;
  shell: ReactNode;
  hydraConfigured?: boolean;
}

export function OsLayout({
  kernel,
  configure,
  agentGraph,
  cpu,
  memory,
  io,
  gpu,
  shell,
  hydraConfigured = false,
}: OsLayoutProps) {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-os-bg font-mono text-os-green lg:flex-row">
      <AnimatedThemeToggler
        variant="star"
        fromCenter
        className="fixed top-3 right-3 z-[60] flex size-8 items-center justify-center rounded border border-os-border bg-os-panel/90 text-os-green shadow-sm transition-colors hover:border-os-green/50 hover:bg-os-panel hover:text-os-amber [&_svg]:size-4"
      />

      {/* Layout A: bento overview — top ~40vh mobile, left column lg */}
      <section
        id="devfactory-bento"
        className={cn(
          "shrink-0 scroll-mt-4 overflow-y-auto border-os-border bg-os-bg p-2 sm:p-3",
          "max-h-[42vh] border-b lg:max-h-none lg:w-[min(44%,540px)] lg:shrink-0 lg:border-b-0 lg:border-r"
        )}
      >
        <DevFactoryBento />
      </section>

      {/* OS monitor */}
      <div
        id="devfactory-os-monitor"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2 pb-28 sm:p-3 sm:pb-32 lg:py-2 lg:pr-3 lg:pl-2"
      >
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
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto p-2 sm:grid-cols-3 sm:grid-rows-[auto_auto_1fr_auto_auto]">
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.02 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 sm:col-span-3 sm:max-h-32"
              >
                {configure}
              </motion.section>
              <motion.section
                id="devfactory-agent-graph"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.04 }}
                className="min-h-[120px] overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 transition-shadow sm:col-span-3 sm:min-h-[140px] sm:max-h-44"
              >
                {agentGraph}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 sm:col-span-1"
              >
                {cpu}
              </motion.section>
              <motion.section
                id="devfactory-memory"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 transition-shadow sm:col-span-2"
              >
                {memory}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="min-h-0 max-h-28 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 sm:col-span-2"
              >
                {io}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-2 sm:col-span-2"
              >
                {gpu}
              </motion.section>
            </div>
            <footer
              id="devfactory-shell"
              className="shrink-0 scroll-mt-24 border-t border-os-border bg-os-panel/30 p-1.5"
            >
              <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-os-dim">
                shell — xterm
              </div>
              <div className="h-[22vh] min-h-[160px] overflow-hidden rounded border border-os-border bg-os-bg lg:h-[24vh]">
                {shell}
              </div>
            </footer>
          </div>
        </Terminal>
      </div>
    </div>
  );
}
