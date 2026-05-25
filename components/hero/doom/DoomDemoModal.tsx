"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { DoomBuildPreview } from "./DoomBuildPreview";
import { DoomGameCanvas, type DoomPlayMode } from "./DoomGameCanvas";
import {
  DOOM_LEVEL_TEMPLATES,
  getTemplateById,
  type DoomLevelTemplate,
} from "./DoomLevelTemplates";

type Screen =
  | "choice"
  | "autoplay"
  | "build-select"
  | "build-preview"
  | "build-play";

interface DoomDemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DoomDemoModal({ open, onClose }: DoomDemoModalProps) {
  const [screen, setScreen] = useState<Screen>("choice");
  const [selectedTemplate, setSelectedTemplate] = useState<DoomLevelTemplate>(
    DOOM_LEVEL_TEMPLATES[0]
  );
  const [narration, setNarration] = useState("Agent: initializing DOOM sector…");

  const reset = useCallback(() => {
    setScreen("choice");
    setSelectedTemplate(DOOM_LEVEL_TEMPLATES[0]);
    setNarration("Agent: initializing DOOM sector…");
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const startAutoplay = () => {
    setSelectedTemplate(DOOM_LEVEL_TEMPLATES[0]);
    setScreen("autoplay");
  };

  const startBuildFlow = () => setScreen("build-select");

  const onPickTemplate = (id: string) => {
    const t = getTemplateById(id);
    if (t) {
      setSelectedTemplate(t);
      setScreen("build-preview");
    }
  };

  const inGame = screen === "autoplay" || screen === "build-play";
  const playMode: DoomPlayMode = screen === "autoplay" ? "autoplay" : "play";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="doom-demo-overlay fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="DOOM demo"
        >
          <Button
            type="button"
            coolMode={false}
            className="absolute inset-0 bg-[#080C14]/88 backdrop-blur-sm"
            aria-label="Close demo"
            onClick={onClose}
          />

          <motion.div
            className={cn(
              "doom-demo-panel relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#1E2D3D] shadow-2xl",
              inGame ? "max-h-[90vh]" : "max-h-[85vh]"
            )}
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            style={{ backgroundColor: "#0D1520" }}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-[#1E2D3D] px-4 py-3">
              <div className="flex items-center gap-2 text-[#00FFB2]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00FFB2] shadow-[0_0_8px_#00FFB2]" />
                <span className="text-left text-[#00FFB2]">
                  agentos · doom sector
                </span>
              </div>
              <Button coolMode
                type="button"
                onClick={onClose}
                className="rounded border border-[#1E2D3D] px-2 py-1 transition-colors hover:border-[#00FFB2]/40"
              >
                <span className="text-left text-[#94A3B8]">
                  ESC close
                </span>
              </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-5">
              {screen === "choice" ? (
                <div className="flex flex-col items-center gap-6 py-4 text-center">
                  <span className="text-center">
                    Low-level DOOM
                  </span>
                  <span className="max-w-md text-center text-[#94A3B8]">
                    Raycaster sector demo — pick how the agent participates.
                  </span>
                  <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
                    <Button coolMode
                      type="button"
                      onClick={startAutoplay}
                      className="doom-demo-choice-btn group rounded-lg border border-[#00FFB2]/35 bg-[#080C14] p-4 text-left transition hover:border-[#00FFB2]"
                    >
                      <span className="text-left text-[#00FFB2]">
                        Watch the agent play
                      </span>
                      <span className="mt-2 text-left text-[#94A3B8]">
                        Autonomous bot — pathfinding, combat, live narration sidebar.
                      </span>
                    </Button>
                    <Button coolMode
                      type="button"
                      onClick={startBuildFlow}
                      className="doom-demo-choice-btn group rounded-lg border border-[#8B5CF6]/35 bg-[#080C14] p-4 text-left transition hover:border-[#8B5CF6]"
                    >
                      <span className="text-left text-[#8B5CF6]">
                        Watch the agent build for you
                      </span>
                      <span className="mt-2 text-left text-[#94A3B8]">
                        Pick a template — agent constructs the level — then you play.
                      </span>
                    </Button>
                  </div>
                </div>
              ) : null}

              {screen === "build-select" ? (
                <div className="flex flex-col gap-4">
                  <span className="text-left text-[#94A3B8]">
                    Select a level template
                  </span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {DOOM_LEVEL_TEMPLATES.map((t) => (
                      <Button coolMode
                        key={t.id}
                        type="button"
                        onClick={() => onPickTemplate(t.id)}
                        className="rounded-lg border border-[#1E2D3D] bg-[#080C14] p-3 text-left transition hover:border-[#8B5CF6]/50"
                      >
                        <span className="text-left text-[#8B5CF6]">
                          {t.name}
                        </span>
                        <p className="mt-1 font-mono text-[10px] leading-snug text-[#94A3B8]/85">
                          {t.description}
                        </p>
                      </Button>
                    ))}
                  </div>
                  <Button coolMode
                    type="button"
                    onClick={() => setScreen("choice")}
                    className="self-start font-mono text-[10px] text-[#94A3B8] underline-offset-2 hover:underline"
                  >
                    <span className="text-left text-[#94A3B8]">
                      ← Back
                    </span>
                  </Button>
                </div>
              ) : null}

              {screen === "build-preview" ? (
                <DoomBuildPreview
                  template={selectedTemplate}
                  onComplete={() => setScreen("build-play")}
                />
              ) : null}

              {inGame ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
                  <div
                    className={cn(
                      "relative min-h-[240px] flex-1 overflow-hidden rounded-lg border border-[#1E2D3D]",
                      screen === "autoplay" ? "lg:min-h-[360px]" : "min-h-[320px]"
                    )}
                  >
                    <DoomGameCanvas
                      key={`${selectedTemplate.id}-${playMode}`}
                      template={selectedTemplate}
                      mode={playMode}
                      onNarration={setNarration}
                      className="absolute inset-0 flex flex-col"
                    />
                  </div>
                  {screen === "autoplay" ? (
                    <aside className="doom-demo-narration w-full shrink-0 rounded-lg border border-[#1E2D3D] bg-[#080C14] p-3 font-mono text-[11px] leading-relaxed text-[#94A3B8] lg:w-52">
                      <span className="mb-2 text-left text-[#8B5CF6]">
                        Agent log
                      </span>
                      <span className="font-mono">{narration}</span>
                    </aside>
                  ) : null}
                </div>
              ) : null}
            </div>

            {screen !== "choice" ? (
              <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#1E2D3D] px-4 py-2">
                <Button coolMode
                  type="button"
                  onClick={() => {
                    if (inGame) setScreen("choice");
                    else if (screen === "build-select") setScreen("choice");
                    else setScreen("build-select");
                  }}
                  className="font-mono text-[10px] text-[#94A3B8] hover:text-[#00FFB2]"
                >
                  <span className="text-left text-[#94A3B8]">
                    ← Menu
                  </span>
                </Button>
                {inGame && screen === "build-play" ? (
                  <span className="text-left text-[#00FFB2]/80">
                    {`${selectedTemplate.name} — your turn`}
                  </span>
                ) : null}
              </footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
