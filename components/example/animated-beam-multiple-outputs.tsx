"use client";

import React, { forwardRef, useRef } from "react";
import { Cpu, Database, Gpu, Terminal, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

const Node = forwardRef<
  HTMLDivElement,
  { className?: string; label: string; children?: React.ReactNode }
>(({ className, label, children }, ref) => (
  <div ref={ref} className="flex flex-col items-center gap-1">
    <div
      className={cn(
        "z-10 flex size-10 items-center justify-center rounded-full border-2 border-os-border bg-os-panel text-os-green shadow-sm sm:size-11",
        className
      )}
    >
      {children}
    </div>
    <span className="max-w-[4.5rem] truncate text-center text-[9px] uppercase tracking-wide text-os-dim">
      {label}
    </span>
  </div>
));
Node.displayName = "Node";

export default function AnimatedBeamMultipleOutputDemo({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const kernelRef = useRef<HTMLDivElement>(null);
  const cpuRef = useRef<HTMLDivElement>(null);
  const hydraRef = useRef<HTMLDivElement>(null);
  const gpuRef = useRef<HTMLDivElement>(null);
  const ioRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-full min-h-[200px] w-full items-center justify-center overflow-hidden p-4",
        className
      )}
    >
      <div className="flex size-full max-w-md flex-row flex-wrap items-center justify-center gap-4 sm:justify-between sm:gap-6">
        <Node ref={shellRef} label="shell">
          <Terminal className="size-4" />
        </Node>
        <Node ref={kernelRef} label="kernel" className="size-12 sm:size-14">
          <Workflow className="size-5" />
        </Node>
        <div className="flex flex-col justify-center gap-3">
          <Node ref={cpuRef} label="cpu">
            <Cpu className="size-4" />
          </Node>
          <Node ref={hydraRef} label="hydradb">
            <Database className="size-4" />
          </Node>
          <Node ref={gpuRef} label="gpu">
            <Gpu className="size-4" />
          </Node>
          <Node ref={ioRef} label="io.bus">
            <span className="font-mono text-[10px]">IO</span>
          </Node>
        </div>
      </div>

      <AnimatedBeam containerRef={containerRef} fromRef={cpuRef} toRef={kernelRef} />
      <AnimatedBeam containerRef={containerRef} fromRef={hydraRef} toRef={kernelRef} />
      <AnimatedBeam containerRef={containerRef} fromRef={gpuRef} toRef={kernelRef} />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={ioRef}
        toRef={kernelRef}
        curvature={-40}
      />
      <AnimatedBeam containerRef={containerRef} fromRef={kernelRef} toRef={shellRef} />
    </div>
  );
}
