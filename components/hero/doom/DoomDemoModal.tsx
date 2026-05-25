"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/a11y/useFocusTrap";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

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
          className="doom-demo-overlay fixed inset-0 z-[200] flex items-center justify-center p-5 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="DOOM demo"
        >
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 h-auto w-auto rounded-none border-0 bg-[#080C14]/95 backdrop-blur-sm"
            aria-label="Close demo"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            className={cn(
              "doom-demo-panel relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#1E2D3D] shadow-2xl",
              inGame ? "max-h-[90vh]" : "min-h-[min(520px,85vh)] max-h-[90vh]"
            )}
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            style={{ backgroundColor: "#0D1520" }}
          >
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#1E2D3D] px-5 py-4">
              <div className="flex items-center gap-2.5 text-[#00FFB2]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#00FFB2] shadow-[0_0_8px_#00FFB2]" />
                <span className="text-left text-[#00FFB2]">
                  agentos · doom sector
                </span>
              </div>
              <Button
                type="button"
                onClick={onClose}
                aria-label="Close DOOM demo"
                className="rounded border border-[#1E2D3D] px-3 py-1.5 transition-colors hover:border-[#00FFB2]/40"
              >
                <span className="text-left text-[#94A3B8]">
                  ESC close
                </span>
              </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6 sm:p-8">
              {screen === "choice" ? (
                <div className="flex w-full flex-1 flex-col items-stretch py-4 sm:py-6">
                  <h2 className="text-center font-mono text-lg tracking-wide text-[#E2E8F0] sm:text-xl">
                    Low-level DOOM
                  </h2>
                  <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-relaxed text-[#94A3B8]">
                    Raycaster sector demo — pick how the agent participates.
                  </p>
                  <div className="doom-demo-choice-group mt-8 w-full pt-6">
                    <button
                      type="button"
                      onClick={startAutoplay}
                      className="doom-demo-choice-btn doom-demo-choice-btn--play"
                    >
                      <span className="doom-demo-choice-title">Watch the agent play</span>
                      <span className="doom-demo-choice-desc">
                        Autonomous bot — pathfinding, combat, live narration sidebar.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={startBuildFlow}
                      className="doom-demo-choice-btn doom-demo-choice-btn--build"
                    >
                      <span className="doom-demo-choice-title">Watch the agent build for you</span>
                      <span className="doom-demo-choice-desc">
                        Pick a template — agent constructs the level — then you play.
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              {screen === "build-select" ? (
                <div className="flex flex-col gap-5">
                  <span className="text-left text-[#94A3B8]">
                    Select a level template
                  </span>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {DOOM_LEVEL_TEMPLATES.map((t) => (
                      <Button
                        key={t.id}
                        type="button"
                        onClick={() => onPickTemplate(t.id)}
                        className="flex min-w-0 flex-col whitespace-normal rounded-lg border border-[#1E2D3D] bg-[#080C14] p-4 text-left transition hover:border-[#8B5CF6]/50"
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
                  <Button
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
                <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                  <div
                    className={cn(
                      "doom-demo-viewport relative min-h-[240px] flex-1 overflow-hidden rounded-lg border border-[#1E2D3D]",
                      screen === "autoplay" ? "lg:min-h-[360px]" : "min-h-[320px]"
                    )}
                  >
                    <ErrorBoundary label="DOOM renderer" className="absolute inset-0 rounded-lg">
                      <DoomGameCanvas
                        key={`${selectedTemplate.id}-${playMode}`}
                        template={selectedTemplate}
                        mode={playMode}
                        onNarration={setNarration}
                        className="absolute inset-0 flex flex-col"
                      />
                    </ErrorBoundary>
                  </div>
                  {screen === "autoplay" ? (
                    <aside className="doom-demo-narration w-full shrink-0 rounded-lg border border-[#1E2D3D] bg-[#080C14] p-4 font-mono text-[11px] leading-relaxed text-[#94A3B8] lg:w-52">
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
              <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#1E2D3D] px-5 py-3">
                <Button
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
