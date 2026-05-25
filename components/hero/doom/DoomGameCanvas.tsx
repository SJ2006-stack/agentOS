"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBotInput, pickNarrationLine } from "./DoomAgentBot";
import {
  applyInput,
  createGameState,
  inputFromKeys,
  renderFrame,
  type GameState,
} from "./doomEngine";
import type { DoomLevelTemplate } from "./DoomLevelTemplates";

export type DoomPlayMode = "autoplay" | "play";

interface DoomGameCanvasProps {
  template: DoomLevelTemplate;
  mode: DoomPlayMode;
  onNarration?: (line: string) => void;
  className?: string;
}

function cloneMap(template: DoomLevelTemplate) {
  return template.map.map((row) => [...row]) as GameState["map"];
}

export function DoomGameCanvas({
  template,
  mode,
  onNarration,
  className,
}: DoomGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const tickRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());
  const [mobileBlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });

  const resetState = useCallback(() => {
    const map = cloneMap(template);
    stateRef.current = createGameState(
      map,
      { ...template.playerStart },
      template.enemySpawns.map((e) => ({ ...e }))
    );
    tickRef.current = 0;
  }, [template]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  useEffect(() => {
    if (mobileBlocked) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current[k] = true;
      if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
      }
      if (k === "r" && stateRef.current && (stateRef.current.gameOver || stateRef.current.won)) {
        resetState();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current[k] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mobileBlocked, resetState]);

  useEffect(() => {
    if (mobileBlocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      tickRef.current += 1;

      const state = stateRef.current;
      if (state) {
        const input =
          mode === "autoplay"
            ? getBotInput(state, tickRef.current)
            : inputFromKeys(keysRef.current);

        applyInput(state, input, dt);

        if (mode === "autoplay" && onNarration && tickRef.current % 45 === 0) {
          onNarration(pickNarrationLine(tickRef.current, state));
        }

        const rect = canvas.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        renderFrame(ctx, state, w, h);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [mode, mobileBlocked, onNarration, template]);

  if (mobileBlocked) {
    return (
      <div className={className}>
        <div className="doom-demo-mobile-fallback">
          <p className="font-mono text-sm text-[#94A3B8]">
            DOOM demo runs best on a desktop viewport (keyboard + canvas).
          </p>
          <p className="mt-2 font-mono text-[11px] text-[#94A3B8]/70">
            Widen the window or use a laptop to play.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="doom-demo-canvas h-full w-full"
        tabIndex={0}
        aria-label="DOOM raycaster demo"
      />
      {mode === "play" ? (
        <p className="doom-demo-controls-hint font-mono text-[10px] tracking-wide text-[#94A3B8]/70">
          WASD move · Q/E turn · Space shoot · R restart
        </p>
      ) : (
        <p className="doom-demo-controls-hint font-mono text-[10px] tracking-wide text-[#94A3B8]/70">
          Agent autopilot active
        </p>
      )}
    </div>
  );
}
