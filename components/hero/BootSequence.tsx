"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { AnimatedSpan, TypingAnimation } from "@/components/ui/terminal";
import { cn } from "@/lib/utils";

const BOOT_LINES = [
  { text: "Initializing AgentOS...", delay: 100, className: "text-hero-cyan" },
  { text: "Loading orchestration...", delay: 1800, className: "text-hero-muted" },
  { text: "Connecting memory fabric...", delay: 3400, className: "text-hero-purple" },
  { text: "Spawning core agents...", delay: 5000, className: "text-hero-cyan" },
] as const;

interface HeroBootSequenceProps {
  onComplete: () => void;
  onSkip?: () => void;
  className?: string;
}

export function HeroBootSequence({
  onComplete,
  onSkip,
  className,
}: HeroBootSequenceProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 7200);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={cn(
        "agentos-hero relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden",
        className
      )}
    >
      <div className="hero-gradient-bg" aria-hidden />
      <div className="hero-particles" aria-hidden />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 w-full max-w-lg rounded-xl border border-hero-graphite/80 bg-hero-obsidian/80 px-6 py-8 font-mono text-sm shadow-2xl backdrop-blur-md"
      >
        <div className="mb-4 text-[10px] uppercase tracking-[0.2em] text-hero-muted">
          AgentOS boot
        </div>
        <div className="space-y-1">
          {BOOT_LINES.map((line, i) =>
            i === 0 ? (
              <TypingAnimation
                key={line.text}
                delay={line.delay}
                startOnView={false}
                duration={40}
                className={line.className}
              >
                {`> ${line.text}`}
              </TypingAnimation>
            ) : (
              <AnimatedSpan
                key={line.text}
                delay={line.delay}
                startOnView={false}
                className={line.className}
              >
                {`> ${line.text}`}
              </AnimatedSpan>
            )
          )}
          <AnimatedSpan delay={6400} startOnView={false} className="text-hero-cyan">
            ✔ AgentOS ready
          </AnimatedSpan>
        </div>
        <button
          type="button"
          onClick={onSkip ?? onComplete}
          className="mt-6 text-[10px] uppercase tracking-wider text-hero-muted transition-colors hover:text-hero-cyan"
        >
          Skip boot →
        </button>
      </motion.div>
    </div>
  );
}
