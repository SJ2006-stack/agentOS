import type { Cell } from "./doomEngine";

export interface DoomLevelTemplate {
  id: string;
  name: string;
  description: string;
  buildSteps: string[];
  map: Cell[][];
  playerStart: { x: number; y: number; angle: number };
  enemySpawns: { x: number; y: number }[];
}

function padMap(rows: string[]): Cell[][] {
  const maxW = Math.max(...rows.map((r) => r.length));
  return rows.map((row) => {
    const cells: Cell[] = [];
    for (let i = 0; i < maxW; i++) {
      const ch = row[i] ?? " ";
      if (ch === "#") cells.push(1);
      else if (ch === "E") cells.push(2);
      else cells.push(0);
    }
    return cells;
  });
}

function spawnsFromMap(map: Cell[][]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 2) {
        map[y][x] = 0;
        out.push({ x, y });
      }
    }
  }
  return out;
}

function finalize(rows: string[], start: { x: number; y: number; angle: number }): DoomLevelTemplate {
  const map = padMap(rows);
  const enemySpawns = spawnsFromMap(map);
  return {
    id: "",
    name: "",
    description: "",
    buildSteps: [],
    map,
    playerStart: start,
    enemySpawns,
  };
}

const corridorRows = [
  "########################",
  "#P......#......#......#",
  "#.####.#.####.#.####.#",
  "#.#..#.#.#..#.#.#..#.#",
  "#.#..#...#..#...#..#.#",
  "#.####.###.####.###.#",
  "#......#E......#E....#",
  "#.####.###.####.###.#",
  "#.#..#...#..#...#..#.#",
  "#.#..#.#.#..#.#.#..#.#",
  "#.####.#.####.#.####.#",
  "#......#......#......#",
  "########################",
];

const plasmaRows = [
  "########################",
  "#P####..............####",
  "#.#..#..########..#..#.#",
  "#.#..#..#......#..#..#.#",
  "#.#..#..#.####.#..#..#.#",
  "#......#.#....E#........",
  "#.######.#.####.######.#",
  "#........#....#........#",
  "#.######.######.######.#",
  "#......#E....#E......#.#",
  "#.####.#.####.#.####.#.#",
  "#......#......#......#.#",
  "########################",
];

const labRows = [
  "########################",
  "#P..#....####....#..#..#",
  "#.#.#.##.#..#.##.#.#.#.#",
  "#.#...#..#..#..#...#.#.#",
  "#.###.#.####.#.###.#.#.#",
  "#...#.#..E..#.#...#....#",
  "###.#.######.#.###.####",
  "#......#..#......#.....#",
  "#.####.#..#.####.#.###.#",
  "#.#..E.#..#.#..E.#.#..#",
  "#.#.####..####.#.#.#.#.#",
  "#......#......#......#.#",
  "########################",
];

export const DOOM_LEVEL_TEMPLATES: DoomLevelTemplate[] = [
  {
    ...finalize(corridorRows, { x: 1.5, y: 1.5, angle: 0 }),
    id: "corridor-ambush",
    name: "Corridor Ambush",
    description: "Tight corridors with flanking demon spawns — agent clears the choke points.",
    buildSteps: [
      "Allocating sector grid 12×12…",
      "Carving corridor mesh #3…",
      "Placing ambush triggers at junction E…",
      "Spawning imp patrol routes…",
      "Baking lightmaps (low-res)…",
      "Level ready — handing controls to operator.",
    ],
  },
  {
    ...finalize(plasmaRows, { x: 1.5, y: 1.5, angle: 0.1 }),
    id: "plasma-vault",
    name: "Plasma Vault",
    description: "Open vault with central plasma alcove and perimeter guards.",
    buildSteps: [
      "Initializing vault template…",
      "Extruding outer shell walls…",
      "Installing plasma core decal…",
      "Sealing vault doors (fake)…",
      "Populating E-type sentries ×2…",
      "Compile OK — enter vault.",
    ],
  },
  {
    ...finalize(labRows, { x: 1.5, y: 1.5, angle: 0.2 }),
    id: "agent-lab",
    name: "Agent Lab",
    description: "Research lab layout — agent wires patrol nodes then releases you.",
    buildSteps: [
      "Loading Agent Lab blueprint…",
      "Laying research wing partitions…",
      "Connecting lab corridor graph…",
      "Injecting test subjects (E)…",
      "Syncing agent patrol AI graph…",
      "Lab online — WASD to explore.",
    ],
  },
];

export function getTemplateById(id: string): DoomLevelTemplate | undefined {
  return DOOM_LEVEL_TEMPLATES.find((t) => t.id === id);
}
