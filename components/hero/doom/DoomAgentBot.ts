import {
  hasLineOfSight,
  raycastDistance,
  type Cell,
  type GameInput,
  type GameState,
} from "./doomEngine";

/** Bot applies movement / combat decisions on this interval (ms). */
export const BOT_TICK_MS = 220;

const TURN_THRESHOLD = 0.06;
const MAX_TURN_PER_TICK = 0.22;
const STUCK_DIST = 0.035;
const POSITION_HISTORY = 8;
const SAME_CELL_STUCK_TICKS = 2;
const GOAL_STALE_TICKS = 3;
const FORWARD_PROBE = 0.42;
const BACKUP_STEPS = 3;

type GridPoint = { x: number; y: number };

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function gridCell(x: number, y: number): GridPoint {
  return { x: Math.floor(x), y: Math.floor(y) };
}

function cellKey(p: GridPoint): string {
  return `${p.x},${p.y}`;
}

function bfsPath(
  map: Cell[][],
  start: GridPoint,
  goal: GridPoint
): GridPoint[] | null {
  const h = map.length;
  const w = map[0]?.length ?? 0;
  const key = (p: GridPoint) => `${p.x},${p.y}`;
  if (start.x === goal.x && start.y === goal.y) return [start];

  const queue: GridPoint[] = [start];
  const cameFrom = new Map<string, string | null>();
  cameFrom.set(key(start), null);

  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: GridPoint[] = [];
      let k: string | null = key(cur);
      while (k) {
        const [px, py] = k.split(",").map(Number);
        path.unshift({ x: px, y: py });
        k = cameFrom.get(k) ?? null;
      }
      return path;
    }

    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
      if (map[ny][nx] === 1) continue;
      const nk = `${nx},${ny}`;
      if (cameFrom.has(nk)) continue;
      cameFrom.set(nk, key(cur));
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function nearestAliveEnemy(state: GameState) {
  let best: { x: number; y: number; dist: number; angle: number } | null = null;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.x - state.playerX;
    const dy = e.y - state.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) - state.playerAngle);
    if (!best || dist < best.dist) {
      best = { x: e.x, y: e.y, dist, angle };
    }
  }
  return best;
}

function probeOpenDirection(state: GameState): number | null {
  const angles = [0, -0.5, 0.5, -1, 1, -1.5, 1.5, Math.PI];
  let best: { angle: number; dist: number } | null = null;
  for (const offset of angles) {
    const a = state.playerAngle + offset;
    const d = raycastDistance(state.map, state.playerX, state.playerY, a);
    if (!best || d > best.dist) {
      best = { angle: offset, dist: d };
    }
  }
  return best && best.dist > 0.55 ? best.angle : null;
}

function canAdvance(state: GameState, angle?: number): boolean {
  const a = angle ?? state.playerAngle;
  return raycastDistance(state.map, state.playerX, state.playerY, a) > FORWARD_PROBE;
}

// --- bot memory (live state each tick, no recordings) ---
let lastX = 0;
let lastY = 0;
let stuckTicks = 0;
let sameCellTicks = 0;
let lastCellKey = "";
let goalDistStaleTicks = 0;
let lastGoalDist = Infinity;
let pathCache: GridPoint[] | null = null;
let pathGoalKey = "";
let positionHistory: string[] = [];
let unstickTicksLeft = 0;
let unstickStrafeLeft = true;
let pendingLog: string | null = null;

function clearBotMemory() {
  lastX = 0;
  lastY = 0;
  stuckTicks = 0;
  sameCellTicks = 0;
  lastCellKey = "";
  goalDistStaleTicks = 0;
  lastGoalDist = Infinity;
  pathCache = null;
  pathGoalKey = "";
  positionHistory = [];
  unstickTicksLeft = 0;
  pendingLog = null;
}

export function resetBotState(): void {
  clearBotMemory();
}

/** Sidebar log line set by the bot on notable events (e.g. stuck). */
export function consumeBotLog(): string | null {
  const line = pendingLog;
  pendingLog = null;
  return line;
}

function pushPositionHistory(state: GameState): void {
  const key = cellKey(gridCell(state.playerX, state.playerY));
  positionHistory.push(key);
  if (positionHistory.length > POSITION_HISTORY) {
    positionHistory.shift();
  }
}

function isOscillating(): boolean {
  if (positionHistory.length < 4) return false;
  const tail = positionHistory.slice(-4);
  const unique = new Set(tail);
  return unique.size <= 2;
}

function noteStuck(reason: string): void {
  pendingLog = `[agent] stuck — ${reason}`;
  pathCache = null;
  pathGoalKey = "";
  unstickTicksLeft = BACKUP_STEPS;
  unstickStrafeLeft = Math.random() < 0.5;
  stuckTicks = 0;
  sameCellTicks = 0;
  goalDistStaleTicks = 0;
}

function updateStuckMetrics(state: GameState, goalDist: number): boolean {
  const moved =
    Math.abs(state.playerX - lastX) + Math.abs(state.playerY - lastY);
  if (moved < STUCK_DIST) stuckTicks += 1;
  else stuckTicks = 0;
  lastX = state.playerX;
  lastY = state.playerY;

  const cell = cellKey(gridCell(state.playerX, state.playerY));
  if (cell === lastCellKey) sameCellTicks += 1;
  else {
    sameCellTicks = 0;
    lastCellKey = cell;
  }
  pushPositionHistory(state);

  if (goalDist < Infinity && goalDist > 2.2) {
    if (Math.abs(goalDist - lastGoalDist) < 0.08) goalDistStaleTicks += 1;
    else goalDistStaleTicks = 0;
    lastGoalDist = goalDist;
  } else {
    goalDistStaleTicks = 0;
    if (goalDist >= Infinity) lastGoalDist = Infinity;
  }

  const stuck =
    sameCellTicks > SAME_CELL_STUCK_TICKS ||
    stuckTicks > 2 ||
    goalDistStaleTicks >= GOAL_STALE_TICKS ||
    isOscillating();

  return stuck;
}

function applyUnstick(input: GameInput, botTick: number): void {
  input.backward = true;
  if (unstickStrafeLeft) input.strafeLeft = true;
  else input.strafeRight = true;
  if (botTick % 2 === 0) input.turnRight = true;
  else input.turnLeft = true;
  unstickTicksLeft -= 1;
}

function smoothTurn(input: GameInput, angleDiff: number): void {
  const turn = Math.max(-MAX_TURN_PER_TICK, Math.min(MAX_TURN_PER_TICK, angleDiff));
  if (turn < -TURN_THRESHOLD) input.turnLeft = true;
  else if (turn > TURN_THRESHOLD) input.turnRight = true;
}

function safeForward(
  input: GameInput,
  state: GameState,
  moveAngle?: number
): void {
  if (canAdvance(state, moveAngle)) input.forward = true;
}

/** Autonomous bot: BFS toward enemies, raycast wall checks, anti-stuck recovery. */
export function getBotInput(state: GameState, botTick: number): GameInput {
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

  if (botTick === 0) clearBotMemory();

  if (unstickTicksLeft > 0) {
    applyUnstick(input, botTick);
    return input;
  }

  const enemy = nearestAliveEnemy(state);
  let goalDist = Infinity;

  if (enemy) goalDist = enemy.dist;

  if (updateStuckMetrics(state, goalDist)) {
    noteStuck("backing up");
    applyUnstick(input, botTick);
    return input;
  }

  if (enemy) {
    const los = hasLineOfSight(
      state.map,
      state.playerX,
      state.playerY,
      enemy.x,
      enemy.y
    );
    const inFov = Math.abs(enemy.angle) < 0.42;

    if (los && inFov && enemy.dist < 11) {
      smoothTurn(input, enemy.angle);
      if (Math.abs(enemy.angle) < TURN_THRESHOLD) {
        input.shoot = state.ammo > 0 && botTick % 2 === 0;
        if (enemy.dist > 1.8) safeForward(input, state);
      }
      return input;
    }

    const gx = Math.floor(enemy.x);
    const gy = Math.floor(enemy.y);
    const goalKey = `${gx},${gy}`;
    if (pathGoalKey !== goalKey || !pathCache || pathCache.length < 2) {
      const start = gridCell(state.playerX, state.playerY);
      pathCache = bfsPath(state.map, start, { x: gx, y: gy });
      pathGoalKey = goalKey;
    }

    if (pathCache && pathCache.length > 1) {
      let waypoint = pathCache[1];
      if (pathCache.length > 2) {
        const wx = waypoint.x + 0.5;
        const wy = waypoint.y + 0.5;
        const ddx = wx - state.playerX;
        const ddy = wy - state.playerY;
        if (ddx * ddx + ddy * ddy < 0.35) {
          pathCache = pathCache.slice(1);
          waypoint = pathCache[1] ?? waypoint;
        }
      }
      const tx = waypoint.x + 0.5;
      const ty = waypoint.y + 0.5;
      const targetAngle = Math.atan2(ty - state.playerY, tx - state.playerX);
      const diff = normalizeAngle(targetAngle - state.playerAngle);
      smoothTurn(input, diff);
      if (Math.abs(diff) < 0.38) safeForward(input, state, targetAngle);
      return input;
    }

    smoothTurn(input, enemy.angle);
    if (Math.abs(enemy.angle) < 0.5) safeForward(input, state);
    return input;
  }

  pathCache = null;
  pathGoalKey = "";
  lastGoalDist = Infinity;

  const open = probeOpenDirection(state);
  if (open !== null) {
    smoothTurn(input, open);
    safeForward(input, state, state.playerAngle + open);
  } else {
    input.turnRight = botTick % 2 === 0;
    input.turnLeft = botTick % 2 !== 0;
    if (canAdvance(state)) input.forward = true;
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

export function pickNarrationLine(botTick: number, state: GameState): string {
  const log = consumeBotLog();
  if (log) return log;

  const idx = Math.floor(botTick / 5) % BOT_NARRATION_LINES.length;
  if (state.enemies.some((e) => e.alive && e.hitFlash > 0)) {
    return "Agent: hit confirmed — suppressing.";
  }
  if (state.won) return "Agent: sector secured. Handoff available.";
  if (state.gameOver) return "Agent: operator down — simulation paused.";
  const alive = state.enemies.filter((e) => e.alive).length;
  if (alive > 0) return `Agent: ${alive} hostile(s) — routing via BFS.`;
  return BOT_NARRATION_LINES[idx];
}
