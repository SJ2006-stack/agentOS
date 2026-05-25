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
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  ammo: number;
  score: number;
  enemies: Enemy[];
  bullets: Bullet[];
  shootCooldown: number;
  muzzleFlash: number;
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
  }));

  return {
    map,
    width: map[0]?.length ?? MAP_W,
    height: map.length,
    playerX: playerStart.x,
    playerY: playerStart.y,
    playerAngle: playerStart.angle,
    health: 100,
    ammo: 50,
    score: 0,
    enemies,
    bullets: [],
    shootCooldown: 0,
    muzzleFlash: 0,
    keys: {},
    gameOver: false,
    won: false,
  };
}

function isWall(map: Cell[][], x: number, y: number): boolean {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (my < 0 || my >= map.length || mx < 0 || mx >= (map[0]?.length ?? 0)) {
    return true;
  }
  const c = map[my][mx];
  return c === 1;
}

function canWalk(map: Cell[][], x: number, y: number, r = 0.22): boolean {
  return (
    !isWall(map, x - r, y - r) &&
    !isWall(map, x + r, y - r) &&
    !isWall(map, x - r, y + r) &&
    !isWall(map, x + r, y + r)
  );
}

export function applyInput(state: GameState, input: GameInput, dt: number): void {
  if (state.gameOver || state.won) return;

  const moveSpeed = 2.8 * dt;
  const rotSpeed = 2.4 * dt;

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
    ny += cos * moveSpeed;
  }

  if (canWalk(state.map, nx, state.playerY)) state.playerX = nx;
  if (canWalk(state.map, state.playerX, ny)) state.playerY = ny;

  state.shootCooldown = Math.max(0, state.shootCooldown - dt);
  state.muzzleFlash = Math.max(0, state.muzzleFlash - dt * 4);

  if (input.shoot && state.shootCooldown <= 0 && state.ammo > 0) {
    state.shootCooldown = 0.22;
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
        e.hitFlash = 0.3;
        state.score += 100;
        b.life = 0;
      }
    }
  }

  for (const e of state.enemies) {
    if (!e.alive) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      continue;
    }
    const dx = state.playerX - e.x;
    const dy = state.playerY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.45) {
      state.health -= 28 * dt;
      if (state.health <= 0) {
        state.health = 0;
        state.gameOver = true;
      }
    } else if (dist > 0.5) {
      const spd = 0.9 * dt;
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

export interface SpriteDraw {
  x: number;
  y: number;
  dist: number;
  kind: "enemy" | "dead";
  flash: number;
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
    });
  }
  return sprites.sort((a, b) => b.dist - a.dist);
}

const FOV = Math.PI / 3;
const MAX_DEPTH = 20;

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number,
  h: number
): void {
  const halfH = Math.floor(h / 2);
  const img = ctx.createImageData(w, h);
  const data = img.data;

  const sky = [8, 12, 20];
  const floor = [20, 14, 10];

  for (let y = 0; y < h; y++) {
    const isCeil = y < halfH;
    const [r, g, b] = isCeil ? sky : floor;
    const shade = isCeil ? 1 - y / halfH * 0.3 : 0.4 + (y - halfH) / halfH * 0.5;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = r * shade;
      data[i + 1] = g * shade;
      data[i + 2] = b * shade;
      data[i + 3] = 255;
    }
  }

  const zBuffer = new Float32Array(w);
  const sin = Math.sin(state.playerAngle);
  const cos = Math.cos(state.playerAngle);

  for (let col = 0; col < w; col++) {
    const cameraX = (2 * col) / w - 1;
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
    const lineH = Math.min(h, Math.floor(h / depth));
    const start = Math.max(0, halfH - lineH / 2);
    const end = Math.min(h, halfH + lineH / 2);

    const wallType = (mapX + mapY) % 3;
    let wr = 120;
    let wg = 40;
    let wb = 30;
    if (wallType === 1) {
      wr = 60;
      wg = 80;
      wb = 100;
    } else if (wallType === 2) {
      wr = 90;
      wg = 50;
      wb = 70;
    }

    const shade = Math.max(0.25, 1 - depth / MAX_DEPTH) * (side === 1 ? 0.75 : 1);
    const stripe = ((mapX + mapY) * 3 + Math.floor(depth * 4)) % 2 === 0 ? 1.08 : 0.92;

    for (let y = start; y < end; y++) {
      const i = (y * w + col) * 4;
      data[i] = wr * shade * stripe;
      data[i + 1] = wg * shade * stripe;
      data[i + 2] = wb * shade * stripe;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const dirX = cos;
  const dirY = sin;
  const planeX = -dirY * 0.66;
  const planeY = dirX * 0.66;

  const sprites = getSprites(state);
  for (const sp of sprites) {
    const spriteX = sp.x - state.playerX;
    const spriteY = sp.y - state.playerY;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
    if (transformY <= 0.2) continue;

    const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
    const spriteH = Math.abs(Math.floor(h / transformY));
    const spriteW = spriteH;
    const drawStartY = Math.max(0, -spriteH / 2 + h / 2);
    const drawEndY = Math.min(h, spriteH / 2 + h / 2);
    const drawStartX = Math.max(0, -spriteW / 2 + spriteScreenX);
    const drawEndX = Math.min(w, spriteW / 2 + spriteScreenX);

    for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
      if (transformY >= zBuffer[stripe]) continue;
      const texX = Math.floor(((stripe - (-spriteW / 2 + spriteScreenX)) * 64) / spriteW);
      const isEnemy = sp.kind === "enemy";
      for (let y = drawStartY; y < drawEndY; y++) {
        const relY = y - drawStartY;
        const relH = drawEndY - drawStartY;
        const isBody = relY > relH * 0.15 && relY < relH * 0.85;
        const isHead = relY <= relH * 0.2;
        if (!isBody && !isHead) continue;

        let r = 180;
        let g = 40;
        let b = 40;
        if (!isEnemy) {
          r = 60;
          g = 60;
          b = 60;
        } else if (isHead) {
          r = 220;
          g = 180;
          b = 120;
        } else if (texX % 8 < 2 || texX % 8 > 5) {
          r = 140;
          g = 20;
          b = 20;
        }
        if (sp.flash > 0) {
          r = 255;
          g = 255;
          b = 200;
        }
        const shade = Math.max(0.3, 1 - transformY / MAX_DEPTH);
        ctx.fillStyle = `rgb(${r * shade},${g * shade},${b * shade})`;
        ctx.fillRect(stripe, y, 1, 1);
      }
    }
  }

  if (state.muzzleFlash > 0) {
    ctx.fillStyle = `rgba(255,220,100,${state.muzzleFlash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  drawHud(ctx, state, w, h);
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const barW = 80;
  const hpPct = state.health / 100;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(12, h - 36, w - 24, 28);
  ctx.fillStyle = "#1e2d3d";
  ctx.fillRect(16, h - 32, barW, 8);
  ctx.fillStyle = hpPct > 0.3 ? "#00ffb2" : "#ff5f57";
  ctx.fillRect(16, h - 32, barW * hpPct, 8);
  ctx.font = "11px monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`HP ${Math.ceil(state.health)}`, 16, h - 38);
  ctx.fillText(`AMMO ${state.ammo}`, 110, h - 26);
  ctx.fillText(`SCORE ${state.score}`, 200, h - 26);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(8,12,20,0.75)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff5f57";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("YOU DIED", w / 2, h / 2 - 8);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px monospace";
    ctx.fillText("Press R to restart", w / 2, h / 2 + 18);
    ctx.textAlign = "left";
  } else if (state.won) {
    ctx.fillStyle = "rgba(8,12,20,0.75)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#00ffb2";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL CLEARED", w / 2, h / 2);
    ctx.textAlign = "left";
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
