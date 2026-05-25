"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { Activity, Bell, Database, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useOsStore } from "@/store/os/osStore";
import { Calendar } from "@/components/ui/calendar";
import AnimatedBeamMultipleOutputDemo from "@/components/example/animated-beam-multiple-outputs";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { Marquee } from "@/components/magicui/marquee";

const MEMORY_SLOT_IDS = [
  "user.session",
  "kernel.orchestrator",
  "cpu.intake",
  "cpu.plan",
  "cpu.route",
  "cpu.dispatch",
  "cpu.verify",
  "cpu.commit",
  "io.bus",
  "hydradb.memory",
] as const;

const BENTO_GLASS =
  "border-os-border/65 bg-os-panel/40 shadow-lg shadow-os-bg/25 backdrop-blur-md ring-1 ring-inset ring-white/[0.04] transition-[border-color,box-shadow,background-color] duration-300 hover:border-os-green/30 hover:bg-os-panel/55 hover:shadow-[0_0_28px_color-mix(in_srgb,var(--os-green)_14%,transparent)]";

const memorySlots = MEMORY_SLOT_IDS.map((id) => {
  const bodies: Record<string, string> = {
    "user.session": "Session context and user intent for the active shell.",
    "kernel.orchestrator": "Schedules agents, routes commands, owns the heartbeat bus.",
    "cpu.intake": "INTAKE — normalizes incoming tasks from shell or API.",
    "cpu.plan": "PLAN — decomposes work before route/dispatch.",
    "cpu.route": "ROUTE — selects agent templates and Hydra recall paths.",
    "cpu.dispatch": "DISPATCH — hands work to GPU workers or verify.",
    "cpu.verify": "VERIFY — checksums outputs against policy.",
    "cpu.commit": "COMMIT — persists slot writes to HydraDB.",
    "io.bus": "IO bus — streams panel events and graph pulses.",
    "hydradb.memory": "Hydra hub — links task memories across agents.",
  };
  return {
    name: `${id}.chunk`,
    body: bodies[id] ?? "Agent memory slot in HydraDB sub-tenant graph.",
  };
});

const pipelineDays = [3, 7, 12, 18, 22];

function LiveStatusBackground() {
  const kernel = useOsStore((s) => s.kernel);
  const cpu = useOsStore((s) => s.cpu);
  const step = cpu.pipeline.currentStep;

  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2 p-3">
      <p className="text-[10px] text-os-dim">
        {kernel.connected ? "kernel online" : "kernel booting"}
        {step ? ` · ${step}` : ""}
      </p>
      <div className="flex flex-wrap items-end gap-2 opacity-70">
        {["INTAKE", "PLAN", "ROUTE", "DISPATCH", "VERIFY", "COMMIT"].map((s) => (
          <span
            key={s}
            className={cn(
              "rounded-md border px-2 py-0.5 font-mono text-[10px] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-300",
              step === s
                ? "border-os-green/50 bg-os-green/15 text-os-green shadow-[0_0_12px_color-mix(in_srgb,var(--os-green)_25%,transparent)] ring-1 ring-os-green/30"
                : "border-os-border/60 bg-os-bg/40 text-os-dim hover:border-os-border hover:bg-os-panel/50"
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

const features = [
  {
    Icon: Database,
    name: "Memory slots",
    description: "HydraDB chunks keyed by agent template — live recall graph.",
    href: "#memory",
    cta: "Open monitor",
    className: cn("sm:col-span-1 lg:col-span-1", BENTO_GLASS),
    background: (
      <Marquee
        pauseOnHover
        className="absolute inset-x-0 top-6 [--duration:24s] [mask-image:linear-gradient(to_top,transparent_30%,#000_95%)]"
      >
        {memorySlots.map((slot, idx) => (
          <figure
            key={idx}
            className={cn(
              "relative w-36 shrink-0 cursor-default overflow-hidden rounded-lg border p-3",
              "border-os-border/60 bg-os-bg/50 backdrop-blur-sm ring-1 ring-inset ring-white/[0.03]",
              "transition-all duration-300 hover:border-os-green/35 hover:bg-os-panel/70",
              "hover:shadow-[0_0_14px_color-mix(in_srgb,var(--os-green)_18%,transparent)]"
            )}
          >
            <figcaption className="font-mono text-xs font-medium text-os-green">
              {slot.name}
            </figcaption>
            <blockquote className="mt-1.5 line-clamp-3 text-[10px] leading-snug text-os-dim">
              {slot.body}
            </blockquote>
          </figure>
        ))}
      </Marquee>
    ),
  },
  {
    Icon: Bell,
    name: "OS events",
    description: "Realtime bus — heartbeat, dispatch, slot_write, verify.",
    href: "#events",
    cta: "View bus",
    className: cn("sm:col-span-1 lg:col-span-2", BENTO_GLASS),
    background: (
      <AnimatedListDemo className="absolute inset-0 top-2 scale-[0.92] border-none [mask-image:linear-gradient(to_top,transparent_8%,#000_92%)] transition-transform duration-300 group-hover:scale-[0.96]" />
    ),
  },
  {
    Icon: Share2,
    name: "Architecture",
    description: "Kernel orchestrates CPU, HydraDB, GPU, and shell I/O.",
    href: "#graph",
    cta: "Agent graph",
    className: cn("sm:col-span-1 lg:col-span-2", BENTO_GLASS),
    background: (
      <AnimatedBeamMultipleOutputDemo className="absolute inset-0 top-0 border-none [mask-image:linear-gradient(to_top,transparent_5%,#000_90%)] transition-transform duration-300 group-hover:scale-[1.02]" />
    ),
  },
  {
    Icon: CalendarIcon,
    name: "Task timeline",
    description: "Pipeline milestones on the CPU schedule — plan → commit.",
    href: "#timeline",
    cta: "Schedule",
    className: cn("sm:col-span-1 lg:col-span-1", BENTO_GLASS),
    background: (
      <Calendar
        mode="single"
        selected={new Date()}
        modifiers={{
          pipeline: pipelineDays.map(
            (d) => new Date(new Date().getFullYear(), new Date().getMonth(), d)
          ),
        }}
        modifiersClassNames={{ pipeline: "font-semibold text-os-amber" }}
        className="absolute top-4 right-0 origin-top scale-[0.82] rounded-lg border border-os-border/60 bg-os-panel/50 shadow-md ring-1 ring-inset ring-white/[0.04] backdrop-blur-md [mask-image:linear-gradient(to_top,transparent_35%,#000_95%)] transition-[transform,box-shadow] duration-300 group-hover:scale-[0.88] group-hover:shadow-[0_0_16px_color-mix(in_srgb,var(--os-amber)_12%,transparent)]"
      />
    ),
  },
  {
    Icon: Activity,
    name: "Live status",
    description: "Kernel heartbeat and CPU pipeline — synced from store.",
    href: "#status",
    cta: "Monitor",
    className: cn("sm:col-span-2 lg:col-span-3", BENTO_GLASS),
    background: <LiveStatusBackground />,
  },
];

export function DevFactoryBento() {
  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 rounded-lg border border-os-border/50 bg-os-panel/30 px-2.5 py-1.5 ring-1 ring-inset ring-white/[0.03] backdrop-blur-sm">
        <span className="text-left text-os-green">
          DevFactory overview
        </span>
        <span className="text-left text-os-dim/90">
          scroll monitor below
        </span>
      </div>
      <BentoGrid className="min-h-0 flex-1 gap-3.5">
        {features.map((feature, idx) => (
          <BentoCard key={idx} {...feature} />
        ))}
      </BentoGrid>
    </div>
  );
}
