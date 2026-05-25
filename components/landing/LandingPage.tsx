"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { queueFirstAgentSpawn } from "@/components/landing/OsSpawnBootstrap";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { hydrateThemePreset, ThemePresetPicker } from "@/components/ui/theme-preset-picker";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

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

const TAGLINE =
  "Spawn AI agents from a terminal and watch them orchestrate tasks across a live agent graph.";

export function LandingPage() {
  const router = useRouter();

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
      <div className="hero-network-lines opacity-40" aria-hidden />

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
        <p className="max-w-xl text-base leading-relaxed text-hero-muted sm:text-lg">
          {TAGLINE}
        </p>

        <AgentRunDemo className="max-w-3xl" />

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSpawn}
          className="rounded-lg border border-hero-cyan/40 bg-hero-graphite/40 px-8 py-3 text-sm font-medium tracking-wide text-hero-cyan shadow-lg shadow-hero-cyan/10 transition-colors hover:border-hero-cyan/70 hover:bg-hero-cyan/10 hover:text-white"
        >
          Spawn your first agent
        </motion.button>
      </motion.div>
    </main>
  );
}
