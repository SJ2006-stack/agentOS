import type { GameInput, GameState } from "./doomEngine";

/** Simple autonomous bot: explore + shoot nearest visible enemy. */
export function getBotInput(state: GameState, tick: number): GameInput {
  const input: GameInput = {
    forward: false,
    backward: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
    shoot: false,
  };

  if (state.gameOver || state.won) return input;

  let nearest: { dist: number; angle: number } | null = null;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.x - state.playerX;
    const dy = e.y - state.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    let diff = angle - state.playerAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.55 && dist < 10) {
      if (!nearest || dist < nearest.dist) {
        nearest = { dist, angle: diff };
      }
    }
  }

  if (nearest) {
    if (nearest.angle < -0.08) input.turnLeft = true;
    else if (nearest.angle > 0.08) input.turnRight = true;
    else {
      input.shoot = tick % 3 !== 0;
      input.forward = nearest.dist > 2.5;
    }
  } else {
    const phase = Math.floor(tick / 30) % 4;
    if (phase === 0) input.forward = true;
    else if (phase === 1) input.turnRight = true;
    else if (phase === 2) input.forward = true;
    else input.turnLeft = true;
  }

  return input;
}

/** Flavor lines for optional narration sidebar (no API). */
export const BOT_NARRATION_LINES = [
  "Agent: scanning sector…",
  "Agent: contact — engaging.",
  "Agent: corridor clear, advancing.",
  "Agent: ammo nominal, continuing patrol.",
  "Agent: flanking route computed.",
  "Agent: target eliminated.",
  "Agent: pathfinding to next junction.",
  "Agent: low threat — exploring.",
] as const;

export function pickNarrationLine(tick: number, state: GameState): string {
  const idx = Math.floor(tick / 90) % BOT_NARRATION_LINES.length;
  if (state.enemies.some((e) => e.alive && e.hitFlash > 0)) {
    return "Agent: hit confirmed — suppressing.";
  }
  if (state.won) return "Agent: sector secured. Handoff available.";
  if (state.gameOver) return "Agent: operator down — simulation paused.";
  return BOT_NARRATION_LINES[idx];
}
