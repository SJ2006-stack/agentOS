"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { queueFirstAgentSpawn } from "@/components/landing/OsSpawnBootstrap";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { hydrateThemePreset, ThemePresetPicker } from "@/components/ui/theme-preset-picker";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const MotionButton = motion.create(Button);

const AgentRunDemo = dynamic(
  () =>
    import("@/components/landing/AgentRunDemo").then((m) => m.AgentRunDemo),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-video w-full max-w-3xl animate-pulse rounded-xl border border-hero-graphite/80 bg-hero-obsidian/90"
        aria-hidden
      />
    ),
  }
);

const DoomDemoModal = dynamic(
  () =>
    import("@/components/hero/doom/DoomDemoModal").then((m) => m.DoomDemoModal),
  { ssr: false }
);

const TAGLINE =
  "Spawn AI agents from a terminal and watch them orchestrate tasks across a live agent graph.";

export function LandingPage() {
  const router = useRouter();
  const [doomDemoOpen, setDoomDemoOpen] = useState(false);

  useEffect(() => {
    hydrateThemePreset();
  }, []);

  const onSpawn = () => {
    queueFirstAgentSpawn();
    router.push("/os");
  };

  return (
    <main className="agentos-hero relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 font-mono">
      <div className="hero-gradient-bg" aria-hidden />
      <div className="hero-particles hero-particles-lite" aria-hidden />
      <div className="hero-network-lines opacity-20" aria-hidden />

      <div className="fixed top-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
        <ThemePresetPicker className="rounded-full border border-hero-graphite/80 bg-hero-obsidian/90 px-1.5 py-1 backdrop-blur-sm" />
        <AnimatedThemeToggler
          variant="star"
          fromCenter
          className={cn(
            "!relative !left-auto !top-auto !translate-x-0",
            "border-hero-graphite bg-hero-obsidian/90 text-hero-cyan hover:border-hero-cyan/50 hover:text-hero-purple"
          )}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center"
      >
        <div className="max-w-xl">
          <span className="text-center text-hero-muted">
            {TAGLINE}
          </span>
        </div>

        <AgentRunDemo className="max-w-3xl" />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <MotionButton
            coolMode
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSpawn}
            className="rounded-lg border border-hero-cyan/40 bg-hero-graphite/40 px-8 py-3 text-sm font-medium tracking-wide text-hero-cyan shadow-lg shadow-hero-cyan/10 transition-colors hover:border-hero-cyan/70 hover:bg-hero-cyan/10 hover:text-white"
          >
            <span className="text-center text-hero-cyan">
              Spawn your first agent
            </span>
          </MotionButton>

          <MotionButton
            coolMode
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDoomDemoOpen(true)}
            className="rounded-lg border border-hero-graphite/80 bg-hero-obsidian/60 px-7 py-3 text-sm font-medium tracking-wide text-hero-muted transition-colors hover:border-hero-purple/50 hover:bg-hero-purple/10 hover:text-hero-cyan"
          >
            <span className="text-center text-hero-muted">Watch DOOM demo</span>
          </MotionButton>
        </div>
      </motion.div>

      <DoomDemoModal open={doomDemoOpen} onClose={() => setDoomDemoOpen(false)} />
    </main>
  );
}
