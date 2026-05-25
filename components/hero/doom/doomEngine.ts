/** Client-side Doom-like raycaster engine (hackathon scope). */

export const TILE = 1;
export const MAP_W = 24;
export const MAP_H = 24;

export type Cell = 0 | 1 | 2 | 3; // 0 empty, 1 wall, 2 enemy, 3 pickup

export interface Enemy {
  id: number;
  x: number;
  y: number;
  alive: boolean;
  hitFlash: number;
  bloodTicks: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface HitscanTracer {
  endX: number;
  endY: number;
  life: number;
}

export interface GameState {
  map: Cell[][];
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  playerAngle: number;
  health: number;
  armor: number;
  ammo: number;
  score: number;
  enemies: Enemy[];
  bullets: Bullet[];
  shootCooldown: number;
  muzzleFlash: number;
  hitscanTracer: HitscanTracer | null;
  keys: Record<string, boolean>;
  gameOver: boolean;
  won: boolean;
}

export interface GameInput {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  shoot: boolean;
}

export function createGameState(
  map: Cell[][],
  playerStart: { x: number; y: number; angle: number },
  enemySpawns: { x: number; y: number }[]
): GameState {
  const enemies = enemySpawns.map((e, i) => ({
    id: i,
    x: e.x + 0.5,
    y: e.y + 0.5,
    alive: true,
    hitFlash: 0,
    bloodTicks: 0,
  }));

  return {
    map,
    width: map[0]?.length ?? MAP_W,
    height: map.length,
    playerX: playerStart.x,
    playerY: playerStart.y,
    playerAngle: playerStart.angle,
    health: 100,
    armor: 50,
    ammo: 50,
    score: 0,
    enemies,
    bullets: [],
    shootCooldown: 0,
    muzzleFlash: 0,
    hitscanTracer: null,
    keys: {},
    gameOver: false,
    won: false,
  };
}

/** Ray distance to nearest wall along angle (for bot wall avoidance). */
export function raycastDistance(
  map: Cell[][],
  x: number,
  y: number,
  angle: number,
  maxDist = 12
): number {
  const step = 0.12;
  for (let d = step; d <= maxDist; d += step) {
    const tx = x + Math.cos(angle) * d;
    const ty = y + Math.sin(angle) * d;
    if (isWall(map, tx, ty)) return Math.max(0, d - step);
  }
  return maxDist;
}

export function isWall(map: Cell[][], x: number, y: number): boolean {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (my < 0 || my >= map.length || mx < 0 || mx >= (map[0]?.length ?? 0)) {
    return true;
  }
  return map[my][mx] === 1;
}

export function canWalk(map: Cell[][], x: number, y: number, r = 0.22): boolean {
  return (
    !isWall(map, x - r, y - r) &&
    !isWall(map, x + r, y - r) &&
    !isWall(map, x - r, y + r) &&
    !isWall(map, x + r, y + r)
  );
}

export function hasLineOfSight(
  map: Cell[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.05) return true;
  const steps = Math.ceil(dist * 8);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(map, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/** Decay timers / enemy AI between render frames (autoplay holds physics on bot ticks). */
export function tickWorld(state: GameState, dt: number): void {
  state.shootCooldown = Math.max(0, state.shootCooldown - dt);
  state.muzzleFlash = Math.max(0, state.muzzleFlash - dt * 5);
  if (state.hitscanTracer) {
    state.hitscanTracer.life -= dt * 6;
    if (state.hitscanTracer.life <= 0) state.hitscanTracer = null;
  }

  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && !isWall(state.map, b.x, b.y));

  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy < 0.18) {
        e.alive = false;
        e.hitFlash = 0.35;
        e.bloodTicks = 12;
        state.score += 100;
        b.life = 0;
      }
    }
  }

  if (state.gameOver || state.won) return;

  for (const e of state.enemies) {
    if (!e.alive) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.bloodTicks = Math.max(0, e.bloodTicks - dt * 8);
      continue;
    }
    const dx = state.playerX - e.x;
    const dy = state.playerY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.45) {
      const dmg = 28 * dt;
      if (state.armor > 0) {
        state.armor = Math.max(0, state.armor - dmg * 0.6);
      } else {
        state.health -= dmg;
      }
      if (state.health <= 0) {
        state.health = 0;
        state.gameOver = true;
      }
    } else if (dist > 0.5) {
      const spd = 0.85 * dt;
      const ex = e.x + (dx / dist) * spd;
      const ey = e.y + (dy / dist) * spd;
      if (canWalk(state.map, ex, ey, 0.18)) {
        e.x = ex;
        e.y = ey;
      }
    }
  }

  if (state.enemies.every((e) => !e.alive) && state.enemies.length > 0) {
    state.won = true;
  }
}

export function applyInput(state: GameState, input: GameInput, dt: number): void {
  if (state.gameOver || state.won) return;

  const moveSpeed = 2.05 * dt;
  const rotSpeed = 2.2 * dt;

  if (input.turnLeft) state.playerAngle -= rotSpeed;
  if (input.turnRight) state.playerAngle += rotSpeed;

  const sin = Math.sin(state.playerAngle);
  const cos = Math.cos(state.playerAngle);

  let nx = state.playerX;
  let ny = state.playerY;

  if (input.forward) {
    nx += cos * moveSpeed;
    ny += sin * moveSpeed;
  }
  if (input.backward) {
    nx -= cos * moveSpeed;
    ny -= sin * moveSpeed;
  }
  if (input.strafeLeft) {
    nx += sin * moveSpeed;
    ny -= cos * moveSpeed;
  }
  if (input.strafeRight) {
    nx -= sin * moveSpeed;
    ny -= cos * moveSpeed;
  }

  if (canWalk(state.map, nx, state.playerY)) state.playerX = nx;
  if (canWalk(state.map, state.playerX, ny)) state.playerY = ny;

  if (input.shoot && state.shootCooldown <= 0 && state.ammo > 0) {
    state.shootCooldown = 0.24;
    state.muzzleFlash = 1;
    state.ammo -= 1;
    const bx = state.playerX + cos * 0.35;
    const by = state.playerY + sin * 0.35;
    state.bullets.push({
      x: bx,
      y: by,
      vx: cos * 9,
      vy: sin * 9,
      life: 1.2,
    });
    const hitDist = raycastDistance(state.map, bx, by, state.playerAngle, 14);
    state.hitscanTracer = {
      endX: bx + cos * hitDist,
      endY: by + sin * hitDist,
      life: 1,
    };
  }
}

export interface SpriteDraw {
  x: number;
  y: number;
  dist: number;
  kind: "enemy" | "dead";
  flash: number;
  blood: number;
  id: number;
}

export function getSprites(state: GameState): SpriteDraw[] {
  const sprites: SpriteDraw[] = [];
  for (const e of state.enemies) {
    const dx = e.x - state.playerX;
    const dy = e.y - state.playerY;
    const dist = dx * dx + dy * dy;
    sprites.push({
      x: e.x,
      y: e.y,
      dist,
      kind: e.alive ? "enemy" : "dead",
      flash: e.hitFlash,
      blood: e.bloodTicks,
      id: e.id,
    });
  }
  return sprites.sort((a, b) => b.dist - a.dist);
}

const FOV = Math.PI / 3;
const MAX_DEPTH = 18;

/** Bottom status bar height in logical canvas pixels. */
export const HUD_HEIGHT = 42;
export const GAME_ASPECT = 4 / 3;
const LETTERBOX = "#0a0a08";

export interface GameViewport {
  gameX: number;
  gameW: number;
  viewH: number;
}

/** Centered 4:3 world band above the HUD strip. */
export function computeGameViewport(w: number, h: number): GameViewport {
  const viewH = Math.max(1, h - HUD_HEIGHT);
  const idealW = Math.floor(viewH * GAME_ASPECT);
  if (w >= idealW) {
    return { gameX: Math.floor((w - idealW) / 2), gameW: idealW, viewH };
  }
  return { gameX: 0, gameW: w, viewH };
}

// Classic DOOM palette (procedural — no WAD assets)
const CEIL_TOP = [42, 36, 28];
const CEIL_BOT = [28, 24, 18];
const FLOOR_NEAR = [48, 38, 28];
const FLOOR_FAR = [18, 16, 14];

function wallTexColor(
  mapX: number,
  mapY: number,
  texCoord: number,
  wallY: number,
  side: number,
  depth: number
): [number, number, number] {
  const variant = (mapX * 7 + mapY * 13) % 3;
  const row = Math.floor(wallY * 10) % 2;
  const col = Math.floor(texCoord * 10) % 2;
  const mortarH = wallY % 0.1 < 0.018;
  const mortarV = texCoord % 0.1 < 0.018;
  const mortar = mortarH || mortarV;

  let r = 78;
  let g = 58;
  let b = 38;
  let r2 = 52;
  let g2 = 42;
  let b2 = 30;
  if (variant === 1) {
    r = 68;
    g = 54;
    b = 44;
    r2 = 46;
    g2 = 40;
    b2 = 34;
  } else if (variant === 2) {
    r = 88;
    g = 68;
    b = 44;
    r2 = 58;
    g2 = 48;
    b2 = 32;
  }

  const brickTone = (row + col) % 2 === 0;
  let br = brickTone ? r : r2;
  let bg = brickTone ? g : g2;
  let bb = brickTone ? b : b2;

  if (mortar) {
    br *= 0.42;
    bg *= 0.42;
    bb *= 0.42;
  }

  const fog = Math.max(0.2, 1 - (depth / MAX_DEPTH) * 0.8);
  const sideShade = side === 1 ? 0.68 : 1;
  return [br * fog * sideShade, bg * fog * sideShade, bb * fog * sideShade];
}

function floorTexColor(
  mapX: number,
  mapY: number,
  depth: number
): [number, number, number] {
  const checker = (mapX + mapY) % 2 === 0;
  const r = checker ? 42 : 34;
  const g = checker ? 32 : 26;
  const b = checker ? 22 : 18;
  const fog = Math.max(0.25, 1 - (depth / MAX_DEPTH) * 0.75);
  return [r * fog, g * fog, b * fog];
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number
): void {
  const vp = computeGameViewport(w, h);
  const { gameX, gameW, viewH } = vp;
  const halfH = Math.floor(viewH / 2);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#2a2a1e";
  ctx.fillRect(0, viewH, w, h - viewH);
  if (gameX > 0) {
    ctx.fillStyle = LETTERBOX;
    ctx.fillRect(0, 0, gameX, viewH);
    ctx.fillRect(gameX + gameW, 0, w - gameX - gameW, viewH);
  }

  const img = ctx.createImageData(gameW, viewH);
  const data = img.data;

  const horizonBand = Math.max(2, Math.floor(halfH * 0.06));

  for (let y = 0; y < viewH; y++) {
    const isCeil = y < halfH;
    const t = isCeil ? y / halfH : (y - halfH) / (viewH - halfH);
    let [r, g, b] = isCeil
      ? [
          CEIL_TOP[0] + (CEIL_BOT[0] - CEIL_TOP[0]) * t,
          CEIL_TOP[1] + (CEIL_BOT[1] - CEIL_TOP[1]) * t,
          CEIL_TOP[2] + (CEIL_BOT[2] - CEIL_TOP[2]) * t,
        ]
      : [
          FLOOR_NEAR[0] + (FLOOR_FAR[0] - FLOOR_NEAR[0]) * t,
          FLOOR_NEAR[1] + (FLOOR_FAR[1] - FLOOR_NEAR[1]) * t,
          FLOOR_NEAR[2] + (FLOOR_FAR[2] - FLOOR_NEAR[2]) * t,
        ];
    if (isCeil && y >= halfH - horizonBand) {
      const bandT = (y - (halfH - horizonBand)) / horizonBand;
      r *= 0.55 + bandT * 0.2;
      g *= 0.55 + bandT * 0.2;
      b *= 0.55 + bandT * 0.2;
    }
    for (let x = 0; x < gameW; x++) {
      const i = (y * gameW + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  const zBuffer = new Float32Array(gameW);
  const sin = Math.sin(state.playerAngle);
  const cos = Math.cos(state.playerAngle);

  for (let col = 0; col < gameW; col++) {
    const cameraX = (2 * col) / gameW - 1;
    const rayAngle = state.playerAngle + Math.atan(cameraX * Math.tan(FOV / 2));
    const raySin = Math.sin(rayAngle);
    const rayCos = Math.cos(rayAngle);

    let mapX = Math.floor(state.playerX);
    let mapY = Math.floor(state.playerY);
    const deltaDistX = Math.abs(1 / rayCos) || 1e10;
    const deltaDistY = Math.abs(1 / raySin) || 1e10;

    let sideDistX: number;
    let sideDistY: number;
    const stepX = rayCos < 0 ? -1 : 1;
    const stepY = raySin < 0 ? -1 : 1;

    if (rayCos < 0) {
      sideDistX = (state.playerX - mapX) * deltaDistX;
    } else {
      sideDistX = (mapX + 1 - state.playerX) * deltaDistX;
    }
    if (raySin < 0) {
      sideDistY = (state.playerY - mapY) * deltaDistY;
    } else {
      sideDistY = (mapY + 1 - state.playerY) * deltaDistY;
    }

    let hit = false;
    let side = 0;
    let depth = 0;
    let hitMapX = mapX;
    let hitMapY = mapY;

    for (let step = 0; step < 64 && !hit; step++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (
        mapY < 0 ||
        mapY >= state.height ||
        mapX < 0 ||
        mapX >= state.width ||
        state.map[mapY][mapX] === 1
      ) {
        hit = true;
        hitMapX = mapX;
        hitMapY = mapY;
        if (side === 0) {
          depth = (mapX - state.playerX + (1 - stepX) / 2) / rayCos;
        } else {
          depth = (mapY - state.playerY + (1 - stepY) / 2) / raySin;
        }
      }
    }

    if (!hit) {
      zBuffer[col] = MAX_DEPTH;
      continue;
    }

    zBuffer[col] = depth;
    const lineH = Math.min(viewH, Math.floor(viewH / depth));
    const start = Math.max(0, halfH - lineH / 2);
    const end = Math.min(viewH, halfH + lineH / 2);

    const wallX =
      side === 0
        ? state.playerY + depth * raySin
        : state.playerX + depth * rayCos;
    const texCoord = wallX - Math.floor(wallX);
    const wallHitY = (y: number) => {
      const rel = (y - start) / Math.max(1, end - start);
      return rel;
    };

    for (let y = start; y < end; y++) {
      const stripe = y % 4 === 0 ? 0.94 : 1;
      const [wr, wg, wb] = wallTexColor(
        hitMapX,
        hitMapY,
        texCoord,
        wallHitY(y),
        side,
        depth
      );
      const i = (y * gameW + col) * 4;
      data[i] = wr * stripe;
      data[i + 1] = wg * stripe;
      data[i + 2] = wb * stripe;
      data[i + 3] = 255;
    }

    for (let y = end; y < viewH; y++) {
      const p = y - halfH;
      const rowDist = halfH / Math.max(1, p);
      const floorX = state.playerX + rowDist * rayCos;
      const floorY = state.playerY + rowDist * raySin;
      const [fr, fg, fb] = floorTexColor(
        Math.floor(floorX),
        Math.floor(floorY),
        rowDist
      );
      const i = (y * gameW + col) * 4;
      data[i] = fr;
      data[i + 1] = fg;
      data[i + 2] = fb;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, gameX, 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(gameX, 0, gameW, viewH);
  ctx.clip();

  const dirX = cos;
  const dirY = sin;
  const planeX = -dirY * 0.66;
  const planeY = dirX * 0.66;

  const sprites = getSprites(state);
  for (const sp of sprites) {
    drawEnemySprite(
      ctx,
      state,
      sp,
      gameX,
      gameW,
      viewH,
      zBuffer,
      dirX,
      dirY,
      planeX,
      planeY
    );
  }

  if (state.hitscanTracer && state.hitscanTracer.life > 0) {
    drawHitscanTracer(ctx, state, gameX, gameW, viewH);
  }

  if (state.muzzleFlash > 0) {
    drawMuzzleFlash(ctx, gameX, gameW, viewH, state.muzzleFlash);
  }

  drawWeapon(ctx, gameX, gameW, viewH, state.muzzleFlash);
  ctx.restore();

  drawHud(ctx, state, w, h, viewH);
  drawMinimap(ctx, state, vp);
}

function drawMuzzleFlash(
  ctx: CanvasRenderingContext2D,
  gameX: number,
  gameW: number,
  viewH: number,
  flash: number
): void {
  const alpha = flash * 0.55;
  const cx = gameX + gameW / 2;
  const cy = viewH * 0.72;
  const r = 14 + flash * 10;
  ctx.fillStyle = `rgba(255,200,80,${alpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,220,${alpha * 0.35})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawHitscanTracer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameX: number,
  gameW: number,
  viewH: number
): void {
  const tr = state.hitscanTracer;
  if (!tr || tr.life <= 0) return;

  const halfH = viewH / 2;
  const dx = tr.endX - state.playerX;
  const dy = tr.endY - state.playerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return;

  const angle = Math.atan2(dy, dx) - state.playerAngle;
  const screenX =
    gameX + gameW / 2 + Math.tan(angle) * (gameW / (2 * Math.tan(FOV / 2)));
  const lineH = Math.min(viewH, Math.floor(viewH / dist));
  const endY = halfH - lineH / 4;
  const alpha = tr.life * 0.85;
  const muzzleY = viewH * 0.72;

  ctx.strokeStyle = `rgba(255,220,80,${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(gameX + gameW / 2, muzzleY);
  ctx.lineTo(screenX, endY);
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.35})`;
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  vp: GameViewport
): void {
  const size = 56;
  const pad = 8;
  const mx = vp.gameX + vp.gameW - size - pad;
  const my = pad;
  const scale = size / Math.max(state.width, state.height);
  const boxPad = 3;

  ctx.fillStyle = "#080806";
  ctx.fillRect(mx - boxPad, my - boxPad, size + boxPad * 2, size + boxPad * 2);
  ctx.strokeStyle = "#1a1814";
  ctx.lineWidth = 2;
  ctx.strokeRect(mx - boxPad + 0.5, my - boxPad + 0.5, size + boxPad * 2 - 1, size + boxPad * 2 - 1);
  ctx.strokeStyle = "#4a4038";
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 1, my - 1, size + 2, size + 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(mx - 1, my - 1, size + 2, size + 2);
  ctx.clip();

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.map[y][x] === 1) {
        ctx.fillStyle = "#4a4038";
        ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
      }
    }
  }

  for (const e of state.enemies) {
    if (!e.alive) continue;
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(
      mx + e.x * scale - 1,
      my + e.y * scale - 1,
      3,
      3
    );
  }

  ctx.fillStyle = "#00ffb2";
  ctx.fillRect(
    mx + state.playerX * scale - 2,
    my + state.playerY * scale - 2,
    4,
    4
  );

  ctx.strokeStyle = "#00ffb2";
  ctx.beginPath();
  ctx.moveTo(mx + state.playerX * scale, my + state.playerY * scale);
  ctx.lineTo(
    mx + (state.playerX + Math.cos(state.playerAngle) * 0.8) * scale,
    my + (state.playerY + Math.sin(state.playerAngle) * 0.8) * scale
  );
  ctx.stroke();
  ctx.restore();
}

function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sp: SpriteDraw,
  gameX: number,
  gameW: number,
  viewH: number,
  zBuffer: Float32Array,
  dirX: number,
  dirY: number,
  planeX: number,
  planeY: number
): void {
  const spriteX = sp.x - state.playerX;
  const spriteY = sp.y - state.playerY;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const transformX = invDet * (dirY * spriteX - dirX * spriteY);
  const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
  if (transformY <= 0.25) return;

  const spriteScreenX = Math.floor((gameW / 2) * (1 + transformX / transformY));
  const distScale = Math.min(2.4, 1.15 / Math.max(0.35, transformY));
  const spriteH = Math.abs(Math.floor((viewH / transformY) * distScale));
  const spriteW = Math.floor(spriteH * 0.72);
  const drawStartY = Math.max(0, Math.floor(-spriteH / 2 + viewH / 2));
  const drawEndY = Math.min(viewH, Math.ceil(spriteH / 2 + viewH / 2));
  const drawStartX = Math.max(0, Math.floor(-spriteW / 2 + spriteScreenX));
  const drawEndX = Math.min(gameW, Math.ceil(spriteW / 2 + spriteScreenX));
  const shade = Math.max(0.28, 1 - transformY / MAX_DEPTH);
  const isEnemy = sp.kind === "enemy";
  const imp = sp.id % 2 === 0;

  for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
    if (transformY >= zBuffer[stripe]) continue;
    const relW = (stripe - drawStartX) / Math.max(1, drawEndX - drawStartX);
    for (let y = drawStartY; y < drawEndY; y++) {
      const relY = (y - drawStartY) / Math.max(1, drawEndY - drawStartY);
      const isHead = relY < 0.22;
      const isTorso = relY >= 0.22 && relY < 0.72;
      const isLegs = relY >= 0.72;
      if (!isHead && !isTorso && !isLegs) continue;

      let r = 140;
      let g = 28;
      let b = 28;
      if (!isEnemy) {
        r = 45;
        g = 18;
        b = 18;
      } else if (imp) {
        if (isHead) {
          r = 180;
          g = 140;
          b = 60;
        } else if (isTorso) {
          r = 120;
          g = 90;
          b = 40;
        } else {
          r = 90;
          g = 70;
          b = 35;
        }
      } else {
        if (isHead) {
          r = 90;
          g = 20;
          b = 20;
        } else if (isTorso) {
          r = 60;
          g = 12;
          b = 12;
        } else {
          r = 40;
          g = 8;
          b = 8;
        }
        if (relW > 0.35 && relW < 0.65 && isTorso) {
          r = 30;
          g = 80;
          b = 30;
        }
      }

      if (sp.flash > 0) {
        r = 255;
        g = 240;
        b = 180;
      }
      if (sp.blood > 0 && relY < 0.5) {
        r = Math.min(255, r + sp.blood * 14);
        g = Math.max(0, g - sp.blood * 6);
        b = Math.max(0, b - sp.blood * 6);
      }

      ctx.fillStyle = `rgb(${Math.floor(r * shade)},${Math.floor(g * shade)},${Math.floor(b * shade)})`;
      ctx.fillRect(gameX + stripe, y, 1, 1);
    }
  }
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  gameX: number,
  gameW: number,
  viewH: number,
  flash: number
): void {
  const gunX = gameX + gameW / 2 - 28;
  const gunY = viewH - 52;
  const barrel = flash > 0 ? "#c8a050" : "#4a4038";

  ctx.fillStyle = "#2a2420";
  ctx.fillRect(gunX, gunY + 8, 56, 38);
  ctx.fillStyle = "#3d3530";
  ctx.fillRect(gunX + 6, gunY + 14, 44, 28);
  ctx.fillStyle = barrel;
  ctx.fillRect(gunX + 20, gunY - 4, 16, 22);
  ctx.fillStyle = "#1a1814";
  ctx.fillRect(gunX + 22, gunY + 30, 12, 14);

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,220,100,${flash * 0.9})`;
    ctx.fillRect(gunX + 18, gunY - 8, 20, 12);
  }

  ctx.strokeStyle = "rgba(180,160,120,0.5)";
  ctx.beginPath();
  ctx.moveTo(gameX + gameW / 2, viewH / 2);
  ctx.lineTo(gameX + gameW / 2, viewH / 2 + 6);
  ctx.stroke();
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number,
  viewH: number
): void {
  const barY = viewH;
  const barH = h - viewH;

  ctx.fillStyle = "#3d3d29";
  ctx.fillRect(0, barY, w, barH);
  ctx.fillStyle = "#2a2a1e";
  ctx.fillRect(0, barY, w, 4);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, barY + 4, w, 1);

  const hp = Math.ceil(state.health);
  const arm = Math.ceil(state.armor);
  const faceX = w / 2 - 24;

  ctx.fillStyle = "#1a1a14";
  ctx.fillRect(faceX, barY + 6, 48, 30);
  drawStatusFace(ctx, faceX + 4, barY + 10, state);

  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#b85c5c";
  ctx.fillText("HEALTH", 12, barY + 14);
  ctx.fillStyle = hp > 30 ? "#cc2222" : "#ff4444";
  ctx.fillText(String(hp).padStart(3, " "), 12, barY + 30);

  ctx.fillStyle = "#5a8a5a";
  ctx.fillText("ARMOR", 72, barY + 14);
  ctx.fillStyle = "#33aa44";
  ctx.fillText(String(arm).padStart(3, " "), 72, barY + 30);

  ctx.fillStyle = "#8a7a5a";
  ctx.fillText("AMMO", w - 72, barY + 14);
  ctx.fillStyle = "#c8b070";
  ctx.fillText(String(state.ammo).padStart(3, " "), w - 72, barY + 30);

  ctx.fillStyle = "#6a6a50";
  ctx.font = "10px monospace";
  ctx.fillText(`SCORE ${state.score}`, w - 72, barY + barH - 6);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(8,8,6,0.82)";
    ctx.fillRect(0, 0, w, viewH);
    ctx.fillStyle = "#cc2222";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("YOU DIED", w / 2, viewH / 2 - 8);
    ctx.fillStyle = "#8a8070";
    ctx.font = "12px monospace";
    ctx.fillText("Press R to restart", w / 2, viewH / 2 + 18);
    ctx.textAlign = "left";
  } else if (state.won) {
    ctx.fillStyle = "rgba(8,8,6,0.82)";
    ctx.fillRect(0, 0, w, viewH);
    ctx.fillStyle = "#33aa44";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL CLEARED", w / 2, viewH / 2);
    ctx.textAlign = "left";
  }
}

function drawStatusFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  state: GameState
): void {
  const hurt = state.health < 40 || state.gameOver;
  const grin = state.won;
  ctx.fillStyle = hurt ? "#8a6050" : "#a08060";
  ctx.fillRect(x + 8, y + 4, 32, 22);
  ctx.fillStyle = "#1a1a14";
  ctx.fillRect(x + 12, y + 10, 8, 6);
  ctx.fillRect(x + 26, y + 10, 8, 6);
  if (grin) {
    ctx.fillStyle = "#33aa44";
    ctx.fillRect(x + 14, y + 20, 20, 4);
  } else if (hurt) {
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(x + 16, y + 20, 16, 3);
  } else {
    ctx.fillStyle = "#4a3028";
    ctx.fillRect(x + 16, y + 20, 16, 2);
  }
}

export function inputFromKeys(keys: Record<string, boolean>): GameInput {
  return {
    forward: !!(keys.w || keys.ArrowUp),
    backward: !!(keys.s || keys.ArrowDown),
    strafeLeft: !!keys.a,
    strafeRight: !!keys.d,
    turnLeft: !!(keys.q || keys.ArrowLeft),
    turnRight: !!(keys.e || keys.ArrowRight),
    shoot: !!keys[" "],
  };
}
