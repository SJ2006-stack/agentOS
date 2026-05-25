"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOT_TICK_MS,
  getBotInput,
  pickNarrationLine,
  resetBotState,
} from "./DoomAgentBot";
import {
  applyInput,
  createGameState,
  inputFromKeys,
  renderFrame,
  tickWorld,
  type GameInput,
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

const EMPTY_INPUT: GameInput = {
  forward: false,
  backward: false,
  strafeLeft: false,
  strafeRight: false,
  turnLeft: false,
  turnRight: false,
  shoot: false,
};

export function DoomGameCanvas({
  template,
  mode,
  onNarration,
  className,
}: DoomGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const botTickRef = useRef(0);
  const botInputRef = useRef<GameInput>({ ...EMPTY_INPUT });
  const lastBotMsRef = useRef(0);
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
    botTickRef.current = 0;
    lastBotMsRef.current = 0;
    botInputRef.current = { ...EMPTY_INPUT };
    resetBotState();
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
      const frameDt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      const state = stateRef.current;
      if (state) {
        if (mode === "autoplay") {
          if (lastBotMsRef.current === 0) lastBotMsRef.current = now;

          while (now - lastBotMsRef.current >= BOT_TICK_MS) {
            botInputRef.current = getBotInput(state, botTickRef.current);
            applyInput(state, botInputRef.current, BOT_TICK_MS / 1000);
            botTickRef.current += 1;
            lastBotMsRef.current += BOT_TICK_MS;

            if (onNarration) {
              const line = pickNarrationLine(botTickRef.current, state);
              if (line.startsWith("[agent]") || botTickRef.current % 5 === 0) {
                onNarration(line);
              }
            }
          }

          tickWorld(state, frameDt);
        } else {
          const input = inputFromKeys(keysRef.current);
          applyInput(state, input, frameDt);
          tickWorld(state, frameDt);
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
          Agent autopilot · live AI every {BOT_TICK_MS}ms
        </p>
      )}
    </div>
  );
}
