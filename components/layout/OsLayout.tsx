"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Terminal } from "@/components/ui/terminal";
import { BootSequence } from "@/components/desktop/BootSequence";
import { DevFactoryBento } from "@/components/desktop/DevFactoryBento";
import { cn } from "@/lib/utils";

export type OsLayoutVariant = "terminal" | "workspace";

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
  /** terminal: shell-forward; workspace: full panel grid + bento */
  variant?: OsLayoutVariant;
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
  variant = "workspace",
}: OsLayoutProps) {
  const isTerminal = variant === "terminal";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-os-bg font-mono text-os-green lg:flex-row">
      {/* Layout A: bento — collapsed in terminal mode, full in workspace */}
      <section
        id="devfactory-bento"
        className={cn(
          "shrink-0 scroll-mt-4 overflow-y-auto border-os-border bg-os-bg transition-all duration-400 ease-in-out",
          isTerminal
            ? "max-h-0 overflow-hidden border-b-0 p-0 opacity-0 lg:max-w-0 lg:w-0 lg:border-r-0 lg:p-0"
            : "max-h-[42vh] border-b p-3 sm:p-4 lg:max-h-none lg:w-[min(44%,540px)] lg:shrink-0 lg:border-b-0 lg:border-r"
        )}
      >
        <DevFactoryBento />
      </section>

      {/* OS monitor */}
      <div
        id="devfactory-os-monitor"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 pb-28 sm:p-4 sm:pb-32 lg:py-3 lg:pr-4 lg:pl-3"
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
            {isTerminal && <BootSequence hydraConfigured={hydraConfigured} />}
            <header className="shrink-0 border-b border-os-border px-4 py-2.5">
              {kernel}
            </header>
            <div
              className={cn(
                "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 transition-all duration-400 ease-in-out sm:grid-cols-3",
                isTerminal
                  ? "sm:grid-rows-[0fr_0fr_0fr_0fr_0fr] [&>section]:max-h-0 [&>section]:overflow-hidden [&>section]:border-0 [&>section]:p-0 [&>section]:opacity-0"
                  : "sm:grid-rows-[auto_auto_1fr_auto_auto]"
              )}
            >
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.02 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 sm:col-span-3 sm:max-h-32"
              >
                {configure}
              </motion.section>
              <motion.section
                id="devfactory-agent-graph"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.04 }}
                className="min-h-[120px] overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 transition-shadow sm:col-span-3 sm:min-h-[140px] sm:max-h-44"
              >
                {agentGraph}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 sm:col-span-1"
              >
                {cpu}
              </motion.section>
              <motion.section
                id="devfactory-memory"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 transition-shadow sm:col-span-2"
              >
                {memory}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="min-h-0 max-h-28 overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 sm:col-span-2"
              >
                {io}
              </motion.section>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="min-h-0 overflow-hidden rounded border border-os-border bg-os-panel/50 p-3 sm:col-span-2"
              >
                {gpu}
              </motion.section>
            </div>
            <footer
              id="devfactory-shell"
              className={cn(
                "shrink-0 scroll-mt-24 border-t border-os-border bg-os-panel/30 p-2.5 transition-all duration-400",
                isTerminal && "flex min-h-0 flex-1 flex-col border-t-os-green/30"
              )}
            >
              <div className="mb-1.5 px-1.5 text-[10px] uppercase tracking-wider text-os-dim">
                shell — xterm
              </div>
              <div
                className={cn(
                  "overflow-hidden rounded border border-os-border bg-os-bg",
                  isTerminal
                    ? "min-h-[280px] flex-1 lg:min-h-0"
                    : "h-[22vh] min-h-[160px] lg:h-[24vh]"
                )}
              >
                {shell}
              </div>
            </footer>
          </div>
        </Terminal>
      </div>
    </div>
  );
}
