"use client";

import { AnimatedSpan, TypingAnimation } from "@/components/ui/terminal";

export function BootSequence({ hydraConfigured }: { hydraConfigured: boolean }) {
  return (
    <div className="shrink-0 space-y-0.5 border-b border-os-border bg-os-panel/40 px-4 py-2 text-xs">
      <TypingAnimation delay={100} startOnView={false} duration={35}>
        $ boot devfactory-os --init
      </TypingAnimation>
      <AnimatedSpan delay={1400} className="text-os-green">
        ✔ KERNEL online
      </AnimatedSpan>
      <AnimatedSpan delay={2200} className="text-os-green">
        ✔ Realtime bus linked
      </AnimatedSpan>
      <AnimatedSpan
        delay={3000}
        className={hydraConfigured ? "text-os-green" : "text-os-fault"}
      >
        {hydraConfigured
          ? "✔ HydraDB connected"
          : "✖ HydraDB disconnected — set HYDRADB_API_KEY"}
      </AnimatedSpan>
      <TypingAnimation delay={4000} startOnView={false} className="text-os-dim">
        Ready.
      </TypingAnimation>
    </div>
  );
}
